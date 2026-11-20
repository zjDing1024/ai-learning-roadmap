# AI Engineer Daily Report｜2026-11-21

日期按马来西亚时间（UTC+8）。主题：用真实文档测试 RAG 的证据边界；用失败注入验证预分配 KV 缓存的提交边界。

## 开源研究

- [CPython argparse](https://github.com/python/cpython/blob/ebf955df7a89ed0c7968f79faec1de49f61ed7cb/Lib/argparse.py#L1877-L1881)（Python 核心开发团队，[PSF License](https://github.com/python/cpython/blob/ebf955df7a89ed0c7968f79faec1de49f61ed7cb/LICENSE)）：从完整旧签名辨别不存在，从新签名验证 Boolean 默认，不能用显式调用替代构造事实。
- [Express 应用默认配置](https://github.com/expressjs/express/blob/cd7d4397c398a3f3ecadeaf9ef6ac1377bd414c4/lib/application.js#L93-L100)（Express 项目维护者，[MIT](https://github.com/expressjs/express/blob/cd7d4397c398a3f3ecadeaf9ef6ac1377bd414c4/LICENSE)）：4.21.2 到 5.1.0 的字符串设置变化，能测出仅看字段名、不看版本或默认意图的错误。
- [Hugging Face Transformers StaticLayer](https://github.com/huggingface/transformers/blob/8cb5963cc22174954e7dca2c0a3320b7dc2f4edc/src/transformers/cache_utils.py#L248-L354)（Hugging Face Transformers 维护者，[Apache-2.0](https://github.com/huggingface/transformers/blob/8cb5963cc22174954e7dca2c0a3320b7dc2f4edc/LICENSE)）：静态槽位和原位写是参考，项目自行实现多层可见状态提交，不照抄代码。

[源码对照、版本与适用边界](../../notes/LLM笔记/2026-11-21-source-oracles-and-cache.md)。

## 文档 RAG：答对、引用支持、拦截不是一回事

新增 `experiments/source-transfer-v1/` 的冻结协议、原创证据摘要、逐案例输入、真实运行记录和离线审计。保留既有生产默认和历史实验。将 CPython `ArgumentParser` 构造行为与 Express `query parser` 固定到原始 release；四份实现源码与锁定版本逐一核对。现有目录仍只接受整数、字符串和 null，本轮用预先声明的字符串表达布尔与不存在，未增加原生布尔或隐式数值转换。

实际用同一 BM25、top-1 和本地免费 Qwen3.5-0.8B Q4_0 跑 22 条 × 两臂；两种来源、三个设置事实家族、五个版本／谓词目标。11 种配置各有中英文，不能把 22 条当独立抽样。正例实际打包到支持片段从 **9/10 到 10/10**；精确值正确且有完整引用支持也从 **9/10 到 10/10**（同案改善 1、退步 0）。未过滤的英语正例先拿到显式设置，看不到默认值，回答 `None`；启用后拿到同版本的默认设置，回答 `False` 并引用该条。

两臂共 **32 次真实 CPU 调用**（22 / 10）。12 条缺证据的用例，未过滤时全接受了模型的回答分支，且都无所需的引用支持（9 条明确错误、3 条只给歧义字符串 `None`）；启用后均为 `no_matching_scope`，在真正调用模型前拦截。模型合同式拒答、无效输出和传输失败均为 0；有效格式下的 `None` 不当作模型拒答。比较没有同时固定上下文和引用集合，因此验证的是管线策略，不意味着模型更会判断证据。范围来自预先审阅的请求和目录，不是从自然语言自动推断，也不证明新领域质量或 Agent 上线条件。

本地 224 项测试、历次离线审计通过；独立复跑 18 项新增测试，23 份归档 JSON 和原记录字节一致。GitHub CI 在 Python 3.11 和 3.12 通过，实际运行新增离线测试和输出审计，不重跑模型。

[提交](https://github.com/zjDing1024/production-rag-system/commit/2c2d5637f5b24e124bb45a7562d1981a490cdcd3) · [运行说明](https://github.com/zjDing1024/production-rag-system/blob/2c2d5637f5b24e124bb45a7562d1981a490cdcd3/experiments/source-transfer-v1/REPORT.md) · [原始记录](https://github.com/zjDing1024/production-rag-system/blob/2c2d5637f5b24e124bb45a7562d1981a490cdcd3/experiments/source-transfer-v1/summary.json) · [精确提交的 CI](https://github.com/zjDing1024/production-rag-system/actions/runs/44772849232)。

## Transformer：预分配时，失败可以留下字节，但不能留下有效状态

在 `src/transformer_core/preallocated.py` 新增可选 `PreallocatedByteDecoder`。原动态路径、训练、旧实验记录不变。固定上限，一次预留后只覆写新后缀；注意力只读取本次有效区间，输出和有限值检查通过才提交长度及批大小。晚期异常不会回滚未使用字节，`reset` 保留预留张量，并非擦除。默认不启用，不支持跨请求并发、分页或驱逐。

固定 99,968 参数的未训练权重，CPU float32 单线程。同一批的两行各 64 个给定 token 在三种分块下对比完整前缀与动态路径；两组贪心共 **96 个新字节完全一致**，logit 最大绝对差 **1.073e-6**。4 项晚期故障对照验证异常或 NaN 不提交状态；短而不同的后缀重试、首次 B2 失败后直接 B1、重置后换批及未用空间注入 NaN 均通过。独立 QA 核对 7 个源码哈希和 46 项针对性测试。

| CPU 观测 | B2/P16/G16 | B2/P32/G32 |
| --- | ---: | ---: |
| 4 块固定 K/V backing storage | 131,072 B | 131,072 B |
| 最终有效 K/V payload | 63,488 B | 129,024 B |
| 原位 K/V `copy_` | 64 次 | 128 次 |
| K/V 拼接 | 0 次 | 0 次 |

写入位点自身的新分配为 0，但逻辑上仍分别写了 63,488 / 129,024 B；token 序列依然有 16 / 32 次拼接。预留 128 KiB 从构造开始就占用，不能用原位写入或无该位点分配来推断峰值、内存总节省、硬件流量或延迟。无 GPU、重新训练或速度实验。

本地 304 项测试、Ruff、格式与编译通过；离线 wheel 在仓库外实际运行一致性／故障检查与离线审计。GitHub CI 已通过，实际运行新路径的固定权重与故障检查，不重跑主 profiler。

[提交](https://github.com/zjDing1024/transformer-from-scratch/commit/d015d2c4af6b3d858846178bf0a20ec950d21866) · [运行说明](https://github.com/zjDing1024/transformer-from-scratch/blob/d015d2c4af6b3d858846178bf0a20ec950d21866/docs/preallocated-kv.md) · [原始记录](https://github.com/zjDing1024/transformer-from-scratch/blob/d015d2c4af6b3d858846178bf0a20ec950d21866/results/preallocated-kv-v1/report.json) · [精确提交的 CI](https://github.com/zjDing1024/transformer-from-scratch/actions/runs/44772800790)。

## 求职价值、能力边界与明日计划

- LLM / AI Engineer：可以用真实 CPU 输出逐条解释“检索到了、格式合法、事实正确、引用支持”为什么是四种不同证据。下一步扩大独立事实和目录不完整的对照；优先验证查询与人工范围标签不一致、同范围材料不足时的失败行为，再决定是否接入只读 Agent。
- 推理工程：可以展示固定容量预算的接口设计、失败状态隔离和资源计数。下一步如条件可控，在同输出的 CPU 非插桩请求中测预留成本与延迟，避免拿本轮写入位点分配代替系统指标。
- 已验证的是上述项目运行行为；未验证本人独立实现与解释，不设为继续工程的门槛。[PyTorch 训练、导出和独立 CPU 推理](https://github.com/zjDing1024/pytorch-from-zero/commit/d81080d81c2ffdf6db7e699c6903ccd5e142f538)保持原主路径，本轮不拆分 Wine。无新仓库、付费资源或线上部署。
