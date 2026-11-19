# AI Engineer Daily Report｜2026-11-20

日期按马来西亚时间（UTC+8）。主题：先核对完整证据范围再做 top-k；把 KV 缓存的张量分配追到调用点。

## 开源研究

- [Apache Lucene 10.3.1](https://github.com/apache/lucene/blob/releases/lucene/10.3.1/lucene/core/src/java/org/apache/lucene/search/BooleanWeight.java#L44-L56)（[Apache-2.0](https://github.com/apache/lucene/blob/releases/lucene/10.3.1/LICENSE.txt)）：必需的非打分条件不参与相关性打分。借鉴其分离资格与打分的设计，不引入 Lucene 依赖。
- [PyTorch Parameter 深复制](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/torch/nn/parameter.py)与[官方 Profiler](https://docs.pytorch.org/docs/2.14/profiler.html)（[BSD 风格](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/LICENSE)）：区分父事件包含的分配与子算子的自身分配，用命名作用域归因，并用正负对照校准。
- [源码阅读笔记与适用边界](../../notes/LLM笔记/2026-11-20-ranking-and-allocation.md)。工程实现为原创，未复制第三方代码。

## Transformer：缓存分配归因

对既有离线可重建的 99,968 参数固定权重做 CPU 单线程 Profiler 观察。不重新训练，不加载历史检查点，不比较插桩延迟或进程峰值。分别标记有限值检查、快照克隆、K/V 拼接和整数 token 拼接。

| 观测 | B2/P16/G16 | B2/P32/G32 |
| --- | ---: | ---: |
| 缓存路径 K/V 拼接次数 | 60 | 124 |
| K/V 拼接算子累计正向自身分配 | 737,280 B | 3,047,424 B |
| 最终 K/V 张量字节 | 63,488 B | 129,024 B |
| 两臂各自的输出序列拼接分配 | 6,272 B | 24,832 B |

快照 35 个参数克隆的分配归到 35 个子级 `aten::empty_strided`，共 399,872 B；有限值检查另有 699,951 B 累计正向自身分配。完整前缀、只预填与只生成一个字节的负控未出现 K/V 拼接；重置没有复制快照，启停探针结果一致。累计分配、活跃张量字节、进程峰值和硬件流量是不同指标，这些观测不能证明节省了内存或降低了延迟。

新增 `transformer-allocation-check`、说明、预先固定的协议、原始 JSON 和审计。主归因运行一次。本地 239 项测试、Ruff、格式和编译均通过；独立 QA 额外跑了 29 项新测试，离线 wheel 在仓库外实际运行 profiler 冒烟和固定权重验收，审计结果一致。精确提交的 GitHub CI 已通过（239 项，并真实执行 profiler 冒烟）；CI 不重跑主归因实验。旧基准结果字节未改；两个原源码版本留档，避免把过去的计时误说成测过当前注入探针的代码。

[提交](https://github.com/zjDing1024/transformer-from-scratch/commit/70c942b57a155529bc31931cc8cd776848d122d6) · [复现](https://github.com/zjDing1024/transformer-from-scratch/blob/70c942b57a155529bc31931cc8cd776848d122d6/docs/operator-allocation.md) · [实测记录](https://github.com/zjDing1024/transformer-from-scratch/blob/70c942b57a155529bc31931cc8cd776848d122d6/results/operator-allocation-v1/report.json) · [CI](https://github.com/zjDing1024/transformer-from-scratch/actions/runs/44564983819)。

## 文档 RAG：别用 top-k 推断范围内没有冲突

新模块 `src/rag_foundation/scoped_pipeline.py` 将带类型的实体、键、版本或观测时间绑定到索引侧目录，检查可比较的已审阅单值声明，再调用原 BM25。候选使用完整索引的分数与顺序，与合格 ID 取交集后才做请求 top-k；不重算 IDF，不改变默认链路。已审阅目录不足、缺声明、值类型或单位不一致会单独阻断，不当作一致。资格不等于打分，声明一致也不等于文本蕴涵、事实正确、访问权限或多个独立来源。当前每个分块只能声明一个范围；目录覆盖和规范值解释仍是运营侧信任边界，不是开放语料默认配置。

冻结主实验 22 个用例 × 2 个开关条件，实际运行索引和管线，生成由可计数替身接管。原路径触发替身 20 次，启用后 7 次；7 条冲突在排名前拦截，另外 8 条分别是无范围、无词面候选、预算不足、目录不完整、缺审阅、不可比或扫描超限。22 条预设路由符合；20 条拥有至少一个分数可比项，合格候选的 27 个分数全部与完整 BM25 相同。另有两条候选在全局先取 top-1 再过滤时落空，先限定资格则能保留。

首轮英文“零词面重叠”检查发现共享词 `is`，所以原英文只证明低排名冲突，不能证明零词面。中文和路径对照的零重叠通过。首轮输入和失败记录保留；另行冻结修正英文的一组同值与冲突，BM25 仍只找回同一条证据；同值允许一次替身调用，冲突在排名前阻断。补充是两条用例，不替换主实验分母。两轮均为 **0 次真实模型调用**，替身的输出不能计作正确回答，也不能证明开放语料效果。

本地 206 项测试通过，独立 QA 复跑 38 项新增测试，原始与修正记录离线重放通过；历史检索和生成源码原样保留。精确提交的 GitHub CI 在 Python 3.11 与 3.12 均通过，实际运行新增路由测试和离线重放。

[提交](https://github.com/zjDing1024/production-rag-system/commit/b27f4c1a42313362f194d532282662ba18c77079) · [管线说明](https://github.com/zjDing1024/production-rag-system/blob/b27f4c1a42313362f194d532282662ba18c77079/docs/indexed-scope-pipeline.md) · [报告与复现](https://github.com/zjDing1024/production-rag-system/blob/b27f4c1a42313362f194d532282662ba18c77079/experiments/indexed-scope-v1/REPORT.md) · [CI](https://github.com/zjDing1024/production-rag-system/actions/runs/44565626665)。

## 求职价值、能力边界与下一步

- LLM / AI Engineer：能够用真正的检索管线演示为什么先取 top-k 会错失证据，并把冲突、缺数据、无候选和预算不足区分开。下一步扩展到未见过的真实来源，用支持正确率和错误放行率复测，再决定是否接受限只读 Agent。
- 推理工程：能够用可复现的 CPU 观测把 K/V 拼接与权重复制归因到算子。下一步对照有界预分配策略，先验证输出一致、失败时状态不串，再单独测资源，避免把理论字节误写成真实收益。
- 上述为助理已验证的项目行为，待本人独立复现和解释的能力尚未验证，不设为工程推进门槛。[PyTorch 训练、导出和独立 CPU 推理主路径](https://github.com/zjDing1024/pytorch-from-zero/commit/d81080d81c2ffdf6db7e699c6903ccd5e142f538)维持原验证成果，不新增 Wine 小实验。本轮没有新仓库、付费资源或公开部署。
