# AI Engineer Daily Report｜2026-11-18

日期按马来西亚时间（UTC+8）。主题：检验 RAG 是否真的按证据作答，以及有界 KV cache 在输出一致时的 CPU 延迟。

## 源码研究

- Google Research [Attributed-QA](https://github.com/google-research-datasets/Attributed-QA/tree/01f114b203ac98e9374471d26dba5e5e07f93409)（[Apache-2.0](https://github.com/google-research-datasets/Attributed-QA/blob/01f114b203ac98e9374471d26dba5e5e07f93409/LICENSE)）把问题和答案共同纳入与证据的核对。本轮参考该思路做原创同题配对，不运行 AutoAIS 或复用数据。
- [llama.cpp b12359](https://github.com/ggml-org/llama.cpp/blob/b1b770d90d94cad9e9ea5b993bdbc383a522fb28/grammars/README.md#json-schemas---gbnf)（[MIT](https://github.com/ggml-org/llama.cpp/blob/b1b770d90d94cad9e9ea5b993bdbc383a522fb28/LICENSE)）的语法约束只保证可表达结构，不判断内容。仍保留应用校验和语义评估。
- [PyTorch v2.9.1 Timer](https://github.com/pytorch/pytorch/blob/v2.9.1/torch/utils/benchmark/utils/timer.py)（[BSD 风格许可](https://github.com/pytorch/pytorch/blob/v2.9.1/LICENSE)）的预热、固定线程池及重复测量作为基准设计参考；没有复制代码。它不是本次 PyTorch 运行版本。[完整源码笔记](../../notes/LLM笔记/2026-11-18-evidence-and-latency.md)。

## 文档 RAG：同一道题，换一块证据

新增独立实验目录，包含生成器两种输出约束、冻结配对样本、运行器、离线审计、测试与逐条记录。8 组同问配对共 16 条上下文，涵盖中英、文档默认值与合成实例状态。每对问题逐字相同：文档组换成另一个配置项，实例组只把快照换成另一应用。这样只看题目类型不能正确区分可答与不可答。合成快照不是真实遥测；没有测试端到端检索排名。

固定 Qwen3.5-0.8B Q4_0 和 llama.cpp b12359，在免费 CPU 上完成 **16 次选择、28 次生成**，没有传输错误。选择器沿用上一版：8 个可答条件都选中支持证据，8 个不足条件只正确拒绝 2 个，其余 6 个被误放。进入下游的 14 条上下文上，两臂使用相同提示、证据、模型、采样与最终校验，仅调整请求所用的响应 schema（包含文本长度约束）。

| 指标 | 原 schema | 分支 schema |
| --- | ---: | ---: |
| 下游合同通过 | 1/14 | 14/14 |
| 最终交付正确、有据回答 | 1/8 | 7/8 |
| 证据不足却被接受作答 | 0/8 | 6/8 |
| 正确回答或合法拒答（含共同上游） | 3/16 | 9/16 |
| 同问两种条件都处理正确 | 1/8 | 2/8 |

两臂的 14 条原始答案文本逐条相同，且下游都没有生成拒答。原臂有 13 条缺引用导致无效，0 条错误放行不等于理解不可答；分支臂仍有一条已选中正确证据的答复漏掉 `/orchid` 的前导斜杠。用格式约束修好了交付形状，却放行了默认值冒充实例值等错误。暂不改默认生成、不开证据门、不接 Agent。语义由 AI 助理审查，非人工标注；无外部留出或上线效果结论。

[提交](https://github.com/zjDing1024/production-rag-system/commit/68464ade084abe7251a6af4cc17ebf28f6700466) · [复现](https://github.com/zjDing1024/production-rag-system/blob/68464ade084abe7251a6af4cc17ebf28f6700466/experiments/matched-evidence-v1/README.md) · [详细报告](https://github.com/zjDing1024/production-rag-system/blob/68464ade084abe7251a6af4cc17ebf28f6700466/experiments/matched-evidence-v1/REPORT.md) · [逐条结果](https://github.com/zjDing1024/production-rag-system/blob/68464ade084abe7251a6af4cc17ebf28f6700466/experiments/matched-evidence-v1/summary.json) · [精确提交 CI](https://github.com/zjDing1024/production-rag-system/actions/runs/44124887472)。本地 139 项测试与新旧记录离线审计通过；精确提交的 Python 3.11 和 3.12 CI 均通过，核验保存的记录，不重新运行模型。

## Transformer：同输出的单线程 CPU 计时

新增独立基准和报告复算脚本，不改变模型或原推理路径。按原训练配方仅重建一次，但文件及张量 SHA-256 均未匹配原检查点；原因未确认。保留失败，然后在计时前单独冻结该重建候选，两条推理路径使用同一份权重；没有再训练挑结果，不报告新模型质量。

对三种固定请求，每种做 30 组交替顺序的配对测量，每个样本取 5 次调用的平均。计时前后生成 ID 完全一致，每轮共核对 112 个输出字节；末位置 logit 最大绝对差约 3.34e-6。下面是各路径的完整热请求中位数，另列配对耗时比中位数，不把两者混算：

| 批大小 / 提示字节 / 输出字节 | 完整前缀 | KV 缓存 | 配对缓存 / 完整前缀 |
| --- | ---: | ---: | ---: |
| 1 / 16 / 16 | 27.10 ms | 19.84 ms | 0.759 |
| 2 / 16 / 16 | 28.00 ms | 19.77 ms | 0.671 |
| 2 / 32 / 32 | 80.63 ms | 40.96 ms | 0.512 |

新缓存会话构造中位 3.44 ms，未计入热请求，也不是含加载的冷启动。最长一组只做预填充时缓存路径反而较慢（2.27 → 2.51 ms）。18 个 Linux 工作进程的三个阶段均报告相同的峰值 RSS 294,548 KiB，本轮无法区分内存表现；31/62/126 KiB 只是精确 K/V 张量负载。结果适用于该单线程共享宿主、模型及固定工作量，不代表 GPU、多并发、生产尾延迟或通用加速。

[提交](https://github.com/zjDing1024/transformer-from-scratch/commit/518d9fc09d64e19f37cf245e82574abb5521113f) · [基准与复现](https://github.com/zjDing1024/transformer-from-scratch/blob/518d9fc09d64e19f37cf245e82574abb5521113f/docs/cpu-kv-benchmark.md) · [原始结果](https://github.com/zjDing1024/transformer-from-scratch/blob/518d9fc09d64e19f37cf245e82574abb5521113f/results/cpu-kv-v1/report.json) · [冻结修订](https://github.com/zjDing1024/transformer-from-scratch/commit/7b777102fe11cf1579aadfca7d57d7db7578d4e0) · [精确提交 CI](https://github.com/zjDing1024/transformer-from-scratch/actions/runs/44124003831)。本地 191 项测试、Ruff、编译及离线复算通过；远端 CPU 检查通过，未复跑本机时延。

## 求职价值与能力边界

适用于 LLM Engineer、AI Engineer 和推理工程方向。仓库展示如何用对照定位「格式变好但答案仍不可信」，以及如何在核对输出一致后分开测预填充、完整热请求和会话构造。已验证的是助理实现及运行的工程行为。个人独立解释与复现能力未验证，不因此中止工程推进。本轮没有新增仓库、Wine 实验、训练选优或付费算力。

## 下一步

RAG 先用新来源测试实体、版本和时间的证据绑定，验收同时设有据回答覆盖与错误放行两个门槛，再考虑接入只读 Agent。Transformer 下一步把可比权重和基准复现入口固定好，定位分配与复制开销；只有更有区分力的内存测法验证后才评价内存收益，不用同一批时延做反复选优。
