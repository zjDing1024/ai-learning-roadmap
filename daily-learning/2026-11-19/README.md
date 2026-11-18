# AI Engineer Daily Report｜2026-11-19

日期按马来西亚时间（UTC+8）。主题：让证据按实体、版本与时间对齐；让 KV 缓存验证脱离不可获得的历史权重。

## 研究与工程意图

- [Qdrant 源码](https://github.com/qdrant/qdrant/blob/23065a0bf6857c3e5da45f6c8939cc746cc0580e/lib/segment/src/payload_storage/condition_checker.rs#L224-L237)（[Apache-2.0](https://github.com/qdrant/qdrant/blob/23065a0bf6857c3e5da45f6c8939cc746cc0580e/LICENSE)）：带类型的元数据精确匹配与全文分词分离。同一证据必须满足所请求的全部作用域字段。
- [Linux v6.18 /proc](https://github.com/torvalds/linux/blob/v6.18/Documentation/filesystems/proc.rst)（[内核许可说明](https://github.com/torvalds/linux/blob/v6.18/COPYING)）：区分进程地址空间的峰值与资源统计中的历史峰值，测量前先验证指标能看到已知分配。
- [PyTorch v2.9.0 复现性说明](https://github.com/pytorch/pytorch/blob/0fabc3ba44823f257e70ce397d989c8de5e362c1/docs/source/notes/randomness.rst)（[BSD 风格许可](https://github.com/pytorch/pytorch/blob/0fabc3ba44823f257e70ce397d989c8de5e362c1/LICENSE)）：固定随机种子不保证跨运行环境逐位一致。

[维护方、源码位置、边界和可借鉴设计](../../notes/LLM笔记/2026-11-19-evidence-scope-and-memory.md)。没有复制第三方代码，也未把研究版本当实验依赖。

## Transformer：不用旧训练权重也能验收缓存逻辑

新增 `transformer-cpu-check`、可重建的固定权重配方、完整前缀对照和 Linux 分阶段内存观察。固定权重的 99,968 个参数由确定的整数与二进制分数生成，重建验证配方和张量两个摘要；它们从未训练过，不是历史模型的恢复，也不测试生成质量。本轮没有重跑历史训练或延迟。

在 Linux x86-64、PyTorch 2.14.1 CPU、单线程下，两行 64 字节输入在整段、逐字节和不等长三种切分均通过组合容差；最大绝对差 9.54e-7。两个固定请求的 96 个新生成字节与完整前缀逐字节一致，逐步 logit 最大绝对差 1.073e-6。

四个独立工作进程的 16 MiB 驻留正控均记录到增长，四个请求窗口的 VmHWM 可观测。完整前缀 / 缓存两个批次设置分别为 291,140 / 292,412 KiB 和 291,544 / 292,252 KiB。缓存张量负载是另一个量：分别为 62 KiB 和 126 KiB。上述峰值是包含加载、Python 及库的绝对进程观测，不等于张量分配，也不能用四个进程估计内存收益；此前相同 RSS 读数的原因仍未确认。

本地 210 项测试、Ruff 和编译通过；实际安装 wheel 后从仓库外运行，固定权重身份、输出核对对象和源码哈希与源码运行一致。精确提交的 GitHub CI 已通过，实际运行缓存对照，但不重跑 Linux 内存实测。

[Transformer 提交](https://github.com/zjDing1024/transformer-from-scratch/commit/8f538be45034eb4696c89973937ef1d16a1db178) · [安装与复现](https://github.com/zjDing1024/transformer-from-scratch/blob/8f538be45034eb4696c89973937ef1d16a1db178/docs/portable-cpu-check.md) · [原始记录](https://github.com/zjDing1024/transformer-from-scratch/blob/8f538be45034eb4696c89973937ef1d16a1db178/results/portable-cpu-v1/report.json) · [精确提交 CI](https://github.com/zjDing1024/transformer-from-scratch/actions/runs/44345881357)。

## 文档 RAG：过滤错版本、错实例和旧快照

新增选择性启用的类型化过滤模块、CLI 样例、冻结对照、真实运行记录和离线审计。类型化请求由可信调用方提供：文档按项目、键、版本精确匹配；快照按应用、键、UTC 时间精确匹配。门只检查元数据，不从问句抽取这些字段，不判断元数据真伪、访问权限或原文真的支持答案。保持原默认生成链路。

64 条上下文涵盖 4 个请求组、3 个事实族、中英文与正负证据条件，并独立交换显示顺序和不透明 ID。每行两条同类型候选。冲突事实含 Flask 1.1.4 的 43,200 秒与 3.1.2 的 `None`；`None` 是正确配置值，不是拒答。两臂用同一 Qwen3.5-0.8B Q4_0、llama.cpp 及分支输出合同，唯一方案差是过滤后的候选文本与允许引用集合。CPU 共 96 次真实生成，无传输或协议错误，进程已停止。

| 指标 | 未过滤 | 启用作用域过滤 |
| --- | ---: | ---: |
| 正例值准确且所有引用匹配作用域 | 23/32 | 32/32 |
| 证据不足但仍作答 | 32/32 | 0/32 |
| 因无匹配而未调用模型 | 0/32 | 32/32 |
| 证据不足时模型主动拒答 | 0 次 | 0 次（未调用） |

未过滤正例中有两条英文句子正确包含精确路由 `/ready-new`，所以值与引用的主指标计为正确；若另外要求整条答案等于字面量，未过滤为 21/32。这不是 64 个独立事实或全链路检索验证。过滤同时改变了候选数和上下文长度，不能推出模型学会了理解作用域。值判定经 AI 独立复核而非人工标注。

同题两种证据都处理正确的配对从 0/32 到 32/32；后者把明确的元数据拦截算在**系统**成功里，而不是当作模型主动拒答。在同一候选文档下要求两版本各引其源、各答其值，成功从 5/8 到 8/8。未过滤正例中有 4 条引用作用域正确却答错值，另有 1 条混合引用；因此仍须看值与原句，不以「引用看起来正确」放行。同一作用域的来源冲突、缺字段和检索侧元数据是否可信尚未验证。

本地共 168 项测试（110 主测试、44 历史测试、14 新实验测试）通过，新旧离线审计通过；精确提交的 Python 3.11 与 3.12 CI 均通过，核验已保存记录，不重新调用模型。

[RAG 提交](https://github.com/zjDing1024/production-rag-system/commit/a275881a1953e94ea7a85a6fc30b738db751f8ef) · [复现](https://github.com/zjDing1024/production-rag-system/blob/a275881a1953e94ea7a85a6fc30b738db751f8ef/experiments/typed-scope-v1/README.md) · [报告](https://github.com/zjDing1024/production-rag-system/blob/a275881a1953e94ea7a85a6fc30b738db751f8ef/experiments/typed-scope-v1/REPORT.md) · [逐条结果](https://github.com/zjDing1024/production-rag-system/blob/a275881a1953e94ea7a85a6fc30b738db751f8ef/experiments/typed-scope-v1/summary.json) · [精确提交 CI](https://github.com/zjDing1024/production-rag-system/actions/runs/44346571924)。

## 求职价值与能力边界

对 LLM／AI Engineer：展示如何把 RAG 的错版本、错实例、错时间从格式错误中区分出来，并用可回查的反例说明为什么默认链路不该直接升级。对推理工程：展示如何独立再生测试权重、先核对功能再解释资源指标，以及诚实报告测量不支持的结论。以上是助理已实施和验证的项目能力；个人独立实现、解释和复现能力仍未验证，不作为继续工程的门槛。

PyTorch 保持[已验证的训练、导出、独立推理主路径](https://github.com/zjDing1024/pytorch-from-zero/commit/d81080d81c2ffdf6db7e699c6903ccd5e142f538)，不重复拆分 Wine。无新增仓库、付费资源或生产部署。

## 明日计划

- RAG：把作用域字段从可验证的索引清单接入实际检索，补同作用域冲突和缺字段对照；同时守住可答覆盖和错误放行，再决定是否接只读 Agent。
- Transformer：评估缓存快照与拼接复制的计量入口，优先记录可归因的工作量与分配来源。若对比真实训练模型，先固定可获得的权重及环境身份，不用程序权重替代历史训练证据。
