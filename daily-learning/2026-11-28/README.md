# AI Engineer Daily Report｜2026-11-28

马来西亚时间（UTC+8）。计划起点为 11 月 27 日 16:00 UTC。

## 学习主题：数值、单位与出处分别验收

从 PostgreSQL 换到新的 CPython asyncio 文档。CPython 3.11.0 的客户端连接和服务端的 TLS 关闭均等待 30 秒（未传值或传 `None` 时），但对应两个方法和不同的源码位置；同一客户端的 TLS 握手则等 60 秒。3.10.0 客户端文档签名没有关闭超时参数。实验核对发布版的文档，不访问任何远端服务，也不把文档说成当前运行实例的状态。

[3.11.0 客户端（握手及关闭）](https://github.com/python/cpython/blob/deaf509e8fc6e0363bd6f26d52ad42f976ec42f2/Doc/library/asyncio-eventloop.rst#L471-L477) · [3.11.0 服务端（关闭）](https://github.com/python/cpython/blob/deaf509e8fc6e0363bd6f26d52ad42f976ec42f2/Doc/library/asyncio-eventloop.rst#L708-L710) · [3.10.0 客户端签名](https://github.com/python/cpython/blob/b494f5935c92951e75597bfe1c8b1f3112fec270/Doc/library/asyncio-eventloop.rst#L367-L372) · [CPython 许可证](https://github.com/python/cpython/blob/deaf509e8fc6e0363bd6f26d52ad42f976ec42f2/LICENSE)。

## 工程结果

新增可选来源定位层：排序结果、模型上下文和最终引用共用同一原文定位；已有行号的 URL 原样保留，没锚点的来源仍补本地行号。摘要片段本身的行号独立保留。默认路径未改，旧 PostgreSQL 收据和冻结判据仍可原样审计。

| 验收项 | 实际结果 |
| --- | --- |
| 离线、有证据的三案 | 30、30、60 秒，整数、单位、证据 ID 及固定 URL 均通过（人工审阅目录值，不是模型生成） |
| 离线、缺证据的两案 | 同题仅删除客户端关闭证据、以及 3.10.0 旧版本，均在排名前停止 |
| 无范围 top-1 诊断 | 同题删证据后选到同为 30 秒的服务端记录；这是排序结果，不是模型生成 |
| 真实本地 CPU 试跑 | 3 次调用，返回 `30`、`30`、`60`；单看裸数字为 3/3，证据 ID 与 URL 也为 3/3，因全部漏写单位，冻结格式 0/3 |
| 两个缺证据请求 | 无调用；不是模型拒答 |

实跑只在带范围检查的路径上执行，未做无检查生成对照。不统计耗时收益。

另用三个合成对照检查评分陷阱：同值错方法、否定正确值、以正确值为例却给出别的默认值，三者都能骗过只搜字面的检查。它们不是模型输出。

新增 provenance 模块、独立文档研究与冻结判据、离线 CLI、真实推理记录、回放审计和回归测试。273 项本地测试通过；Python 3.11 和 3.12 的远端 CI 复核新离线记录均通过。从干净检出独立复跑了 CPython 离线验收、原始推理回放及 PostgreSQL 历史回放。

[实验与复跑](https://github.com/zjDing1024/production-rag-system/blob/fd47504748f894e1a08f05c9c4910f3a96ebce92/experiments/cpython-timeout-provenance-v1/README.md) · [RAG 提交](https://github.com/zjDing1024/production-rag-system/commit/fd47504748f894e1a08f05c9c4910f3a96ebce92) · [CI](https://github.com/zjDing1024/production-rag-system/actions/runs/46030218669)。本轮未新建仓库，PyTorch 与 Transformer 无变更。

## 技术理解与求职价值

给 LLM／RAG 岗位看的关键是这一对控制：问题原封不动，只移除适用的证据。另一条写着同一个数值的来源不能替代。引用 ID 对了，还需核对实际显示的链接；有出处也不自动证明回答的语义。不能靠全文中有没有出现正确的数字来评分，否定句、另一个对象和示例都容易误过关。历史 PostgreSQL 收据与规则保留，提示词缓存混杂了旧的耗时数据，不能宣称提速。这些是工程验证，不是对个人已掌握能力的认证。

## 下一步

把数值与单位改为独立的结构化字段，在未参与设计的请求上比较输出合同是否减少漏单位，同时守住证据不足不放行。再把可复跑入口连到项目首页，不追加同类微型用例来凑提交。
