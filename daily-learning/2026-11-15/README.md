# AI Engineer Daily Report｜2026-11-15

日期按马来西亚时间（UTC+8）。主题：本地 RAG 的引用合同与证据边界、Transformer 的外部文档检验。

## 开源研究

[llama.cpp b12359](https://github.com/ggml-org/llama.cpp/tree/b12359)（[MIT](https://github.com/ggml-org/llama.cpp/blob/b12359/LICENSE)）的本地 HTTP 服务将 JSON Schema 转为生成语法约束。借鉴它的调用合同，不复制实现；结构化生成和应用校验是两层，二者都不能单独证明引用支持答案。[源码与接口学习记录](../../notes/LLM笔记/2026-11-15-structured-rag-contract.md)

## RAG：首次实跑检索到本地模型

新增可选的本地生成适配器和 CLI，保留候选与原始模型输出。程序校验 JSON、引用 ID 与拒答状态的一致性；模型与网络故障独立计数，不当成拒答成功。检索接口与旧评测维持不变。修复干净检出复制命令时缺少 `build/` 的问题。

固定 [Qwen3.5-0.8B Q4_0 量化版本](https://huggingface.co/ggml-org/Qwen3.5-0.8B-GGUF/tree/004fd086eccea9f7cf867aa07ba328773beef81d)（Apache-2.0）和 12 个新问题（6 个中英语义对），分别在固定上下文下对比文本和结构化策略，再跑真实检索到生成。固定上下文产生 24 个请求，两条策略同时改变提示词和输出形式，不将差异单独归因于 JSON Schema。结构化策略回答出 4/4 可答题，但对 8 个不足或缺失题有 7 个无依据作答，另 1 个拒答对象字段互相矛盾。文本策略对 8/8 负例精确拒答，可答事实正确 1/4：其余两题误拒、一题答错。

真实检索链路 12 题中 4 题因无候选直接退出；其余 8 个请求中 5 个回答格式和引用 ID 有效，逐题检查只有 1 个答案有证据支持且正确；3 个响应违反合同。四个可答题的正确事实都在供给模型的第一片段；这些失败不能归因于漏召回。格式合法的错误包括答错属性，以及在文档无依据时编出配置上限。这是已运行的端到端原型，不是可靠回答或生产就绪。共 36 次流程、32 次模型请求。所有推理使用云端工作区的免费 CPU，未下载模型到 CI 或上传权重。

最终干净检出：84 项本地测试与 6 份产物逐字节复现；[精确提交 CI](https://github.com/zjDing1024/production-rag-system/actions/runs/43614764193) 的 Python 3.11／3.12 均通过，CI 验证已有响应记录，不重跑模型。[工程提交](https://github.com/zjDing1024/production-rag-system/commit/8f6f9ba459ab3460529e67ca31ce0eee8d8e532d) · [复现命令](https://github.com/zjDing1024/production-rag-system/blob/8f6f9ba459ab3460529e67ca31ce0eee8d8e532d/experiments/bilingual-generation-v1/README.md) · [逐题汇总](https://github.com/zjDing1024/production-rag-system/blob/8f6f9ba459ab3460529e67ca31ce0eee8d8e532d/experiments/bilingual-generation-v1/summary.json) · [原始请求和响应](https://github.com/zjDing1024/production-rag-system/tree/8f6f9ba459ab3460529e67ca31ce0eee8d8e532d/experiments/bilingual-generation-v1/recorded)。

## Transformer：同一组检查点的 SQLite 外部检验

依据 [SQLite 官方文档版权说明](https://www.sqlite.org/copyright.html)及其 [docsrc 来源](https://www.sqlite.org/getthecode.html)，固定三份不同主题的官方文档。原始六个检查点未长期保留，本轮按原训练协议重建后逐一核对，文件 SHA-256 与张量摘要都一致。未重新选种子、选模型或用 SQLite 分数调参。

在相同的 52,351 个 byte target 上，有位置编码的平均 NLL 为 3.064089，无显式位置为 3.074392；Flask 训练集的固定 bigram 为 3.089247。三个配对差值方向一致，但平均仅约 0.0103，其中一份无位置检查点略输给 bigram。89 项本地测试及 Ruff、格式、编译通过，[精确提交 CI](https://github.com/zjDing1024/transformer-from-scratch/actions/runs/43614118864) 通过（不重跑外部评分和训练），同输入的评分报告重放逐字节一致。[工程提交](https://github.com/zjDing1024/transformer-from-scratch/commit/d4f0a3e425cf7d9d56bada1cdd8a15d1b522f568) · [复现命令](https://github.com/zjDing1024/transformer-from-scratch/blob/d4f0a3e425cf7d9d56bada1cdd8a15d1b522f568/docs/sqlite-transfer.md) · [逐文档结果](https://github.com/zjDing1024/transformer-from-scratch/blob/d4f0a3e425cf7d9d56bada1cdd8a15d1b522f568/results/sqlite-transfer-v1/report.json)。SQLite 模板源与 Flask RST 的差异同时包含主题和标记格式，不称纯领域迁移，也不据此声称稳健泛化。

## 求职价值与边界

工程证据面向 AI/LLM 工程岗位：可复现实验、独立留出、结构化响应与故障归因。作品验证不等于个人独立实现能力已获验证。PyTorch 保留已验证的训练到预测主路径，不重复 Wine 小实验。

## 下一步

优先把「证据是否足以支持这一具体结论」作为独立门控，再用新题分别测误答与误拒；格式合规或正则匹配不是语义判定。不扩大 Agent 权限，等核心证据流程在负例上更可靠再接有限只读工具。Transformer 下一步可控制文本提取格式，分离主题差异和模板标记差异。
