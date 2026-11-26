# AI Engineer Daily Report｜2026-11-27

马来西亚时间（UTC+8）。计划起点为 11 月 26 日 16:00 UTC（11 月 27 日 00:00 MYT）。

## 学习主题：有引用，不代表在回答同一个问题

将 PostgreSQL 16.0／17.0 的五个固定请求接入本机 Qwen3.5-0.8B Q4_0。普通 BM25 和加证据范围检查的路径均取 top-1，沿用相同模型、提示模板、输出格式和预算。模型与二进制按哈希核验；在推理之前冻结用例、选择和评分口径，未用结果回调配置。

| 指标 | 仅 BM25 top-1 | 先检查版本、设置和谓词 |
| --- | ---: | ---: |
| 实际模型调用 | 5 | 2 |
| 缺少目标证据时进入回答分支 | 3/3 | 0/3 |
| 缺少目标证据时由流程直接停止 | 0/3 | 3/3 |
| 模型明确拒答、传输失败、格式失败（分别） | 0、0、0 | 0、0、0 |
| 两条有证据问题：正确引用 ID，且人工复核数值和单位正确 | 2/2 | 2/2 |
| 两条有证据问题：命中冻结的严格展示格式 | 0/2 | 0/2 |

普通检索的两个邻近设置用例改答了 `idle_in_transaction_session_timeout`；另一个把预备事务例外的证据配上文本 `None`，仍标记为回答，不是明确拒答。范围检查的三个负例没有调用模型，因此不能说成模型学会拒答。四条正例写成了包含「0 milliseconds」及完整设置名的句子，未命中预注册的简短展示格式；不事后改分。模型返回的是证据 ID，不是已验证可点击的 URL。实跑路径的某些候选 URL 仍有重复锚点；回看上游原文要按证据 ID 和独立来源映射定位。

## 开源研究与工程证据

- [llama.cpp b12359](https://github.com/ggml-org/llama.cpp/releases/tag/b12359)（[MIT](https://github.com/ggml-org/llama.cpp/blob/b12359/LICENSE)）的[服务端接口](https://github.com/ggml-org/llama.cpp/blob/b12359/tools/server/README.md)支持约束 JSON 格式，但不会替应用层核对论断与证据；[Qwen3.5-0.8B GGUF](https://huggingface.co/ggml-org/Qwen3.5-0.8B-GGUF) 标注 Apache-2.0。实验复用本机 CPU 运行器，不把权重、服务器程序或凭据放进仓库。
- 证据来自固定版本的 PostgreSQL 文档（[PostgreSQL License](https://www.postgresql.org/about/licence/)）。[目标默认值](https://github.com/postgres/postgres/blob/d7ec59a63d745ba74fba0e280bbf85dc6d1caa3e/doc/src/sgml/config.sgml#L9368-L9382)和[预备事务例外](https://github.com/postgres/postgres/blob/d7ec59a63d745ba74fba0e280bbf85dc6d1caa3e/doc/src/sgml/config.sgml#L9396-L9400)都含目标设置名，但回答的是不同问题。没有运行数据库、执行 SQL、访问付费服务或修改默认生成路径。
- [实测复跑说明](https://github.com/zjDing1024/production-rag-system/blob/89c1b3ac0926df69f1bc1970dd77ada4ed3acd65/experiments/postgres-agent-transfer-v1/README.md) · [逐次原始输出](https://github.com/zjDing1024/production-rag-system/blob/89c1b3ac0926df69f1bc1970dd77ada4ed3acd65/experiments/postgres-agent-transfer-v1/recorded-live.json) · [工程提交](https://github.com/zjDing1024/production-rag-system/commit/89c1b3ac0926df69f1bc1970dd77ada4ed3acd65) · [精确提交 CI](https://github.com/zjDing1024/production-rag-system/actions/runs/45854683376)。
- 独立从干净检出运行旧版 CLI 的同题对照：`--case pg17-transaction` 返回整数 0、单位毫秒及正确出处；`--case pg17-neighbors-only` 移除一个证据，返回空回答与空引用、零次排名。完整 `--check` 匹配五条冻结离线记录。这是无需模型的演示，不是本机推理数据。见[固定版本复跑入口](https://github.com/zjDing1024/production-rag-system/blob/cfff0d1ecd7800c15c533a53bcdf2e60b10009c5/experiments/postgres-agent-transfer-v1/README.md)。
- 本地 262 项测试通过（159 项核心、103 项实验），原始响应可在不调用模型的情况下重放检查。前一天的[路线记录](../2026-11-26/README.md)已进入默认分支，并复核首页入口。PyTorch 和 Transformer 未改动，未拆新仓库。

## 求职价值、边界与下一步

面向 LLM／RAG 岗位，这组对照展示了检索、证据 ID、格式合同和事实支持如何分别验收。它只验证了一个小模型及一组人工审阅的请求，不代表任意问题、不同文档或部署负载下的表现，也不是个人已掌握技能的证明。下步先把数值与单位的输出合同、证据 ID 到原文锚点的映射拆开验收，再用未参与设计的新文档验证；不在当前五个样例上调分。
