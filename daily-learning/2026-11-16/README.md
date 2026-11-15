# AI Engineer Daily Report｜2026-11-16

日期按马来西亚时间（UTC+8）。本轮主题：RAG 证据充分性门控与可审计作品集入口。

## 开源研究

[Vibrant Labs 的 Ragas v0.4.1](https://github.com/vibrantlabsai/ragas/tree/4308b2466e2536c89451dd5098b738108bdaf7da)（[Apache-2.0](https://github.com/vibrantlabsai/ragas/blob/4308b2466e2536c89451dd5098b738108bdaf7da/LICENSE)）以逐声明方式评估回答忠实度。[SQuAD 2.0 原论文](https://aclanthology.org/P18-2124/)提供相似而不可答的负例设计思路。本轮只借鉴比较方法，不引入库、复制实现或采用原数据。详见[源码阅读与口径](../../notes/LLM笔记/2026-11-16-evidence-sufficiency.md)。

## 工程与评测

### RAG：新门控没有通过真实验收，默认继续关闭

在 `sufficiency.py` 新增可选的生成前判别，`generation.py` 提供 `--evidence-gate`，测试覆盖开关、逐字引用归属、畸形输出及错误分类。门控读取同一检索上下文，先判断是否足以回答具体问题；判为充分时，证据摘录必须逐字出现在所引片段，才调用原生成器。真实引文证明来源，不会自动证明它支撑问题。

使用固定的 llama.cpp b12359 与 Qwen3.5-0.8B Q4_0，冻结 12 道中英题（6 个事实对）与 4 次同题换上下文诊断；证据充分性和回答正确性由 AI 助理逐题检查，不是真人标注。两臂固定检索、传给模型的上下文、模型和原生成策略，不根据这批结果修改门控。28 次流程产生 24 次真实模型调用，完全用免费 CPU。

| 真实检索链路 | 关闭门控 | 启用门控 |
| --- | ---: | ---: |
| 有候选且进入门控 | 0 | 10 |
| 调用生成器 | 10 | 0 |
| 正确、有证据支持的最终回答 | 3 | 0 |
| 有效模型拒答／门控因证据不足退出 | 0 | 0 |
| 合同有效但无依据／答非所问 | 4 | 0 |
| 输出或合同无效 | 3 | 10 |
| 原检索无候选退出，不计门控效果 | 2 | 2 |

14 次模型门控请求（含 4 次同题诊断）原始输出均判“充分”，但全部被逐字引用合同挡下；删掉决定性数值后还是判“充分”。没有运行传输错误。启用后不再作答不是语义改进：证据充足的四题也被技术校验中断。小模型会改写原文、引用错误片段或把邻近数字算到错误属性；这项实现作为负结果和回归入口保留，不能当成可用的证据筛选器。两种语言是配对题，不是 12 个独立事实；同一个小模型承担门控和生成，不能视为独立复核。

干净检出编译、95 项主测试及 6 项审计测试通过，7 份记录逐字节复算一致。[RAG 提交](https://github.com/zjDing1024/production-rag-system/commit/2bd1a005d39a9141d94b0132481394f1c1998c09) · [冻结评测与复跑](https://github.com/zjDing1024/production-rag-system/blob/2bd1a005d39a9141d94b0132481394f1c1998c09/experiments/evidence-sufficiency-v1/README.md) · [逐题记录](https://github.com/zjDing1024/production-rag-system/blob/2bd1a005d39a9141d94b0132481394f1c1998c09/experiments/evidence-sufficiency-v1/summary.json) · [精确提交 CI](https://github.com/zjDing1024/production-rag-system/actions/runs/43735999502)（3.11／3.12 均通过；不运行模型）。

### Transformer：同一目标、同长历史的 SQLite 格式对照

重新构建原实验的六个选中检查点，逐一通过文件 SHA-256 和张量摘要核对，没有使用 SQLite 重新训练或选模。用三份固定 [SQLite 文档源码](https://www.sqlite.org/getthecode.html)（[公开领域版权说明](https://sqlite.org/copyright.html)）创建可审计的纯文本投影。不执行文档源码或官方渲染器，不把它称作网站的完整渲染。

固定同一个源对齐目标字节，两种表示各使用前面的 64 个字节，只比较最后一位的 NLL。共冻结 768 个历史实际发生改变的目标，以及 192 个前缀完全相同的负控；负控的逐目标分差为零。消除了旧块式评分规则的位置重置差异，但去标记也改变了 64 字节能装下的文本和距离，所以不把结果归因于纯标记语法或用于跨域泛化推断。

| 变化历史的目标，NLL 越低越好 | 原始历史 | 投影历史 | 投影－原始 |
| --- | ---: | ---: | ---: |
| 显式正弦位置，三种子均值 | 2.941931 | 2.895443 | −0.046488 |
| 无显式位置，三种子均值 | 2.920568 | 2.881337 | −0.039231 |
| 原 Flask 训练-only bigram | 2.841660 | 2.827103 | −0.014557 |

两组模型的三个种子在这批抽样目标上都因投影而降低 NLL，但两个模型组仍不如同目标 bigram。显式位置相对无位置的投影收益方向在种子间不一致；不对照上一轮的全量文档 PPL，也不主张统计泛化。

107 项本地测试通过，Ruff、格式、编译均通过，评分报告重放逐字节一致。[Transformer 提交](https://github.com/zjDing1024/transformer-from-scratch/commit/1f88bdb9eb83f3939611f0b37af8ab2dfa6192f2) · [协议与复现](https://github.com/zjDing1024/transformer-from-scratch/blob/1f88bdb9eb83f3939611f0b37af8ab2dfa6192f2/docs/sqlite-format-control.md) · [分文档结果](https://github.com/zjDing1024/transformer-from-scratch/blob/1f88bdb9eb83f3939611f0b37af8ab2dfa6192f2/results/sqlite-format-v1/report.json) · [精确提交 CI](https://github.com/zjDing1024/transformer-from-scratch/actions/runs/43735747831)（不重跑真实训练或评分）。

## 作品集导航

学习仓库首页现在先列三份独立工程的运行入口和固定提交证据，再展示历史学习轨迹。PyTorch 看训练到导出和新进程推理的记录；Transformer 的机制演示不重跑真实训练；RAG 可离线检索或审计已记录回答，完整模型复跑独立可选。保留旧日报的时间范围，本轮未新增 Wine 实验。

## 求职价值、边界和下一步

工程证据可展示 LLM/RAG 工程岗位看重的实验控制、错误归因和可审计交付。验证的是项目行为，不等于个人已经独立实现或掌握。

下一轮先比较候选证据编号选择与逐字抽取，再用未经调参的题验证是否真的减少无依据回答、同时保住可答覆盖；引用校验不是语义支持判断。当前门控保持关闭，不上 Agent。Transformer 记录保留现有固定对照，不根据这批目标选模型。
