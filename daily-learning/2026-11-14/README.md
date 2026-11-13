# AI Engineer Daily Report

日期：2026-11-14（马来西亚时间，UTC+8）。主题：用冻结评测区分 RAG 证据命中与证据不足；继续推进 Transformer 真实文本评测，不重复 Wine 小实验。

## 开源研究

[IBM RAGWorkbench](https://github.com/IBM/RagWorkbench/tree/98cc965b079f332ce27fc7ad87be6fcce69e1931)（[Apache-2.0](https://github.com/IBM/RagWorkbench/blob/98cc965b079f332ce27fc7ad87be6fcce69e1931/LICENSE)）将推理输出、上下文与分指标评测分离，保留逐题结果和汇总，便于定位问题。阅读了实验编排、推理输出与指标注册；借鉴分层设计，未复制源码、安装上游框架或调用付费服务。参见[阅读笔记](../../notes/LLM笔记/2026-11-14-rag-evaluation-design.md)和 [Sufficient Context（ICLR 2025）](https://arxiv.org/abs/2411.06037)。

## RAG：24 题冻结双语挑战集

基于同一批已许可 Flask 3.1.0 文档，新增 12 对中英问题，分为可答、相关但不足、缺失三类（各 8 题）。先冻结问题、语料、切分和现有策略，未用新题调词典、门槛或 k。逐题输出候选 ID、证据命中和空/非空，并保留分语言的分母。一次独立审查发现 a02 的引用短句在不同配置章节重复；保留原结果并额外用配置章节锚点复核，未改变本轮命中结论。

| 策略 | 可答证据 Hit@5 | 相关不足仍返回候选 | 缺失仍返回候选 |
|---|---:|---:|---:|
| 原始 BM25 | 7/8 | 7/8 | 4/8 |
| 词典展开 | 8/8 | 8/8 | 4/8 |
| 词典＋现有覆盖门 | 8/8 | 8/8 | 0/8 |

现有覆盖门的可答命中为英语 4/4、中文 4/4；相关但不足的候选返回在两种语言均为 4/4。关键负结果：词汇门能挡住这组缺失题，却没有挡住相关但不能回答的题。返回候选不等于回答错误；这组实验没有生成器。两种语言是同义配对，且问题作者了解语料和旧策略，不把 24 道自编题当作独立泛化基准。

[RAG 工程提交](https://github.com/zjDing1024/production-rag-system/commit/8270451dc3ecbd39af859e1796dbb2abb5693a7a) · [实验报告](https://github.com/zjDing1024/production-rag-system/blob/8270451dc3ecbd39af859e1796dbb2abb5693a7a/docs/bilingual-challenge-report.md) · [逐题结果](https://github.com/zjDing1024/production-rag-system/blob/8270451dc3ecbd39af859e1796dbb2abb5693a7a/results/bilingual-challenge-v1.json)。54 项本地测试通过；新旧结果及补充审计逐字节复现。已核验远端 main 与本地验收树一致，[精确提交 CI](https://github.com/zjDing1024/production-rag-system/actions/runs/43458803922)通过。

## 本地生成可行性：模型确实运行，严格合同未通过

使用公开 [Qwen3.5-0.8B](https://huggingface.co/Qwen/Qwen3.5-0.8B) 的 [Q4_0 GGUF](https://huggingface.co/ggml-org/Qwen3.5-0.8B-GGUF)（模型 Apache-2.0）与 [llama.cpp](https://github.com/ggml-org/llama.cpp)（MIT），CPU 本地执行三条固定上下文测试，HTTP 均返回 200。严格验收 **0/3**：英文仅输出 `S1.`；中文回答基本有依据但漏 `[S1]`；缺证据时拒答语义正确但多了句点，不符合精确输出合同。这是模型运行与失败定位，不是检索和生成已集成或可上线。未上传权重。[生成实验提交](https://github.com/zjDing1024/production-rag-system/commit/e9f12c93e3e10e9e49fff7f747c070a02e74e089) · [复现脚本、原始响应和报告](https://github.com/zjDing1024/production-rag-system/tree/e9f12c93e3e10e9e49fff7f747c070a02e74e089/experiments/local-generation-smoke)。整合后本地 60 项测试通过；[精确提交 CI](https://github.com/zjDing1024/production-rag-system/actions/runs/43460603026) 通过；记录验收不下载或重跑模型。

## Transformer：配对隔离显式位置编码

参照 [Transformer 论文 §3.5](https://arxiv.org/abs/1706.03762) 和 [PyTorch 官方语言模型示例](https://github.com/pytorch/examples/blob/acc295dc7b90714f1bf47f06004fc19a7fe235c4/word_language_model/main.py)（BSD-3-Clause）的验证选模流程，原创实现。先冻结三种子配对方案，每种子比较有/无正弦位置编码，两臂都使用相同参数量和 600 步预算。完成训练和验证选模后，另进程在 Flask 三份新留出文档的 25,532 个 byte target 上打分；不复用旧测试文档选策略。三次配对均是有位置编码的 NLL 更低：有位置均值 2.414795，无显式位置 2.440424，配对平均差 0.025629；训练集 bigram 参考为 2.593534。只有三个种子和一个文档来源，不能称统计显著或跨域泛化。两臂均使用因果遮罩，无显式位置不等于完全无顺序信息。

[Transformer 工程提交](https://github.com/zjDing1024/transformer-from-scratch/commit/8d28a61ae8fb5407bd1c54e35b636c6d248d90aa) · [实验报告及运行命令](https://github.com/zjDing1024/transformer-from-scratch/blob/8d28a61ae8fb5407bd1c54e35b636c6d248d90aa/docs/position-study.md)。74 项本地测试、Ruff、格式、编译及库外安装冒烟通过；同环境重放对齐全部留出得分，不计作新增种子。核验远端 main 的 Git 树与本地验收版一致。[精确提交 CI](https://github.com/zjDing1024/transformer-from-scratch/actions/runs/43460091574)通过；CI 不等同于本地六次完整训练。

## 求职价值与边界

面向 AI/LLM 工程岗位，真正有用的是展示如何固定对照、保留逐题证据、复查误计并定位失败，不只展示最佳分数。本轮验证的是工程实现及本次实验，不是本人已掌握；个人独立解释和复现尚无新证据，不设为工程推进门槛。PyTorch 主路径保持本轮不变。

## 下一步

先用结构化输出和引用 ID 校验实现带引用回答与缺证据拒答；把今天的 24 题当回归集，并另留新题验证证据充分性，不能只追求答复格式正确。有稳定生成与评测后再接受限 Agent。Transformer 不以测试结果选配置，后续再扩大语料与留出覆盖。
