# AI Engineer Daily Report｜2026-11-26

按马来西亚时间（UTC+8）。本次计划起点为 11 月 25 日 16:00 UTC，即 11 月 26 日 00:00 MYT。

## 文档 RAG：把只读引用流程迁移到 PostgreSQL

沿用已验证的只读证据工作流，把来源换成 PostgreSQL 16.0／17.0 的发布标签文档。这里考察的是：值恰好相同、来源却指向别的设置时，是否仍会错误引用。分别检查覆盖、误放行，以及实际返回的来源位置，避免只按数值打分。

| 预设验收条件 | 本次只读重放 |
| --- | --- |
| 17.0 两个完整默认值 | 2/2 返回整数 `0`、单位 `ms`，且各自引用独立、固定的源码定位 |
| 17.0 只有同值邻近设置 | 无匹配范围，未进入排名 |
| 16.0 没有目标设置，仅有邻近设置 | 无匹配范围，未进入排名 |
| 17.0 只有预备事务例外 | 无匹配范围，未进入排名 |
| 合计 | 5 次检索尝试、2 次实际 BM25 排名、0 次模型调用 |

三个负例各自在另行运行的**不限制范围** BM25 诊断中能命中，说明三个负例均有词法匹配可供干扰，但不代表去掉范围约束就一定答错。该诊断不计入流程内两次排名；流程内三组都停止且无回答或引用。两条正例也不能互相替代引文，只匹配 `0 ms` 会错过这个问题。

独立于索引的冻结验收记录检查整数类型、单位、来源定位与停止原因。它还发现摘要渲染在已有行号的 URL 后追加了第二个 `#`，偏离正确行段。本轮在可选重放路径保留上游定位，摘要的文本、偏移和哈希仍单独记录。旧的十场景报告逐字节不变，默认 CLI 未增加 PostgreSQL 注册。实验使用注册请求、离线索引和文档证据，没有运行 PostgreSQL，没有发出 SQL，也没有调用模型。

## 源码证据：同一数值也要核对具体设置

PostgreSQL 17.0 的 [`transaction_timeout` 默认值](https://github.com/postgres/postgres/blob/d7ec59a63d745ba74fba0e280bbf85dc6d1caa3e/doc/src/sgml/config.sgml#L9368-L9382)和 [`statement_timeout` 默认值](https://github.com/postgres/postgres/blob/d7ec59a63d745ba74fba0e280bbf85dc6d1caa3e/doc/src/sgml/config.sgml#L9332-L9346)都注明默认整数为 `0`，省略单位时按毫秒解释，零禁用该超时；两节的对象不同。17.0 还有[事务内空闲会话超时](https://github.com/postgres/postgres/blob/d7ec59a63d745ba74fba0e280bbf85dc6d1caa3e/doc/src/sgml/config.sgml#L9441-L9454)。[预备事务（prepared transaction）例外](https://github.com/postgres/postgres/blob/d7ec59a63d745ba74fba0e280bbf85dc6d1caa3e/doc/src/sgml/config.sgml#L9396-L9400)单独说明适用范围，不提供默认值或单位。16.0 固定的[完整配置章节](https://github.com/postgres/postgres/blob/c372fbbd8e911f2412b80a8c39d7079366565d67/doc/src/sgml/config.sgml)仍有[语句超时](https://github.com/postgres/postgres/blob/c372fbbd8e911f2412b80a8c39d7079366565d67/doc/src/sgml/config.sgml#L9118-L9132)与[事务内空闲会话超时](https://github.com/postgres/postgres/blob/c372fbbd8e911f2412b80a8c39d7079366565d67/doc/src/sgml/config.sgml#L9191-L9204)，没有 `transaction_timeout` 条目。以上是发布标签源码证据，不是实测服务器配置。

上游源码和文档适用 [PostgreSQL License](https://www.postgresql.org/about/licence/)（[17.0 固定许可](https://github.com/postgres/postgres/blob/d7ec59a63d745ba74fba0e280bbf85dc6d1caa3e/COPYRIGHT)）。该许可允许使用、修改和分发，分发复制内容须保留上游版权、许可与免责声明。本实验的检索语料只含原创 MIT 摘要和源码定位，不复制上游正文。引用定位须区分上游原文与工程自己的摘要。

## 复跑与交付

在固定提交的 RAG 仓库执行：

```sh
python -B experiments/postgres-agent-transfer-v1/replay.py --check
python -B experiments/postgres-agent-transfer-v1/replay.py --case pg17-transaction
```

第一条离线核对保存的五例结果，第二条查看事务超时的精确引用。4 项新增实验测试通过，本地总计 256 项通过（159 核心、97 实验）。Python 3.11 和 3.12 的精确提交 CI 均通过，包括 PostgreSQL 离线重放。这是预设请求的验收，不是自由文本问答、运行时实测或生产安全保证。

[复现说明](https://github.com/zjDing1024/production-rag-system/blob/cfff0d1ecd7800c15c533a53bcdf2e60b10009c5/experiments/postgres-agent-transfer-v1/README.md) · [冻结验收](https://github.com/zjDing1024/production-rag-system/blob/cfff0d1ecd7800c15c533a53bcdf2e60b10009c5/experiments/postgres-agent-transfer-v1/oracle.json) · [实测记录](https://github.com/zjDing1024/production-rag-system/blob/cfff0d1ecd7800c15c533a53bcdf2e60b10009c5/experiments/postgres-agent-transfer-v1/report.json) · [提交](https://github.com/zjDing1024/production-rag-system/commit/cfff0d1ecd7800c15c533a53bcdf2e60b10009c5) · [精确 CI](https://github.com/zjDing1024/production-rag-system/actions/runs/45650883439)。

## 后续

保留同值错引和版本不存在作为回归。下一轮优先补测试此前未注册、不同版本确有不同值的证据，继续分开计有据覆盖、误放行与工具预算，再考虑小范围接入模型选择。Transformer 和 PyTorch 保留已有可运行交付，不重复训练或测试历史基准。
