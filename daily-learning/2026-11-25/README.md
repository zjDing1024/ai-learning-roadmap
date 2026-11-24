# AI Engineer Daily Report｜2026-11-25

按马来西亚时间（UTC+8）。计划起点为 11 月 24 日 16:00 UTC，即 11 月 25 日 00:00 MYT。

## 文档 RAG：受限只读证据工作流

在现有 RAG 仓库增加可选离线入口。固定请求 ID 绑定主体、版本、谓词，从六份附带摘要中检索。未知请求和范围错配在检索前停止；只有零词法命中才允许用预审别名在同范围内重试一次。目录冲突、证据缺失、未经审阅或打包失败都不重试。引用前核对证据 ID、范围、定位与摘要；报告中的哈希属于原创摘要，不是上游源码。原检索和生成默认不变，没有对外服务。

| 10 个预设 CLI 场景 | 实际结果 |
| --- | ---: |
| 返回带引用的值 | 3 |
| 明确停止 | 7 |
| 检索尝试（含只走预检） | 9 |
| 进入 BM25 排名 | 6 |
| 每个请求的最大检索尝试 | 2 |
| 实际模型调用 | 0 |

两版 Express 与 CPython 别名重试各返回一条已审阅的值。停止用例覆盖检索上限、打包上限、冲突、缺证据、未审阅、错范围和未知请求。其中一个冲突项没有词法重叠，预检仍在排名前拦住；独立测试还验证了有效 ID 配错范围或修改定位都不能引用。9 次尝试中 3 次仅做预检。工作流不调用模型、网络、SQL 或任意文件，不把固定请求原型称为通用问答、用户授权或语义充分性验证。

## 复跑与交付

在固定提交的 RAG 仓库（Python 3.10+，只用标准库）：

```sh
PYTHONPATH=src python -B -m rag_foundation.safe_document_agent express-5-default
python -B experiments/read-only-agent-v1/replay.py --check
```

首条命令返回 Express 5 的 `simple` 及引用；第二条实际运行 10 个 CLI 场景并逐字节核对保存报告。11 项定向测试通过，完整本地套件 252 项通过（159 核心、93 冻结实验）；独立重放、编译和历史审计通过。精确提交在 Python 3.11 与 3.12 的 CI 均通过，包括离线重放。[运行与来源](https://github.com/zjDing1024/production-rag-system/blob/288c6777c2db93824092daca72d770b5ea8209a8/experiments/read-only-agent-v1/README.md) · [保存报告](https://github.com/zjDing1024/production-rag-system/blob/288c6777c2db93824092daca72d770b5ea8209a8/experiments/read-only-agent-v1/report.json) · [提交](https://github.com/zjDing1024/production-rag-system/commit/288c6777c2db93824092daca72d770b5ea8209a8) · [精确 CI](https://github.com/zjDing1024/production-rag-system/actions/runs/45432773299)。

## 开源源码：把工具暴露、调用权限和预算分开

参考 OpenAI 的 [Agents SDK](https://github.com/openai/openai-agents-python/tree/4e162c79a4a951c6fc8b698d5c8279c1963c099b)（[MIT](https://github.com/openai/openai-agents-python/blob/4e162c79a4a951c6fc8b698d5c8279c1963c099b/LICENSE)）。[工具筛选](https://github.com/openai/openai-agents-python/blob/4e162c79a4a951c6fc8b698d5c8279c1963c099b/src/agents/agent.py#L290-L319)按 `is_enabled` 决定本地函数工具是否可见；[工具文档](https://github.com/openai/openai-agents-python/blob/4e162c79a4a951c6fc8b698d5c8279c1963c099b/docs/tools.md#L902-L915)明确说这不能代替按参数、按资源的权限核对。[Runner](https://github.com/openai/openai-agents-python/blob/4e162c79a4a951c6fc8b698d5c8279c1963c099b/src/agents/run.py#L309-L324)的 `max_turns` 计模型轮，不计工具调用；[并行说明](https://github.com/openai/openai-agents-python/blob/4e162c79a4a951c6fc8b698d5c8279c1963c099b/docs/running_agents.md#L185-L194)进一步区分一轮发出多个调用与任务并发数。

这里借鉴边界划分，不依赖该 SDK，也不复制代码。受限证据工作流应在调度前用可信配置核对工具名和目标范围，另外计量实际派发；拒绝、无证据和异常应有各自的终止状态，不能从输出格式或自然语言判断是否真的访问了证据。

## 后续

先扩大独立证据来源，观察有据覆盖、错误放行和工具预算是否保持，再考虑接入一个由模型提出、但仍由本地调度强制校验的选择步骤。Transformer 和 PyTorch 保留已有可复跑交付，本轮不重复训练及基准。
