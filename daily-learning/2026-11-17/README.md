# AI Engineer Daily Report｜2026-11-17

日期按马来西亚时间（UTC+8）。本轮主题：同一批证据下比较逐字复述与编号选取，以及在不改训练路径的情况下验证 Transformer 增量推理。

## 源码研究

- [Princeton NLP 的 ALCE](https://github.com/princeton-nlp/ALCE/tree/246c476a4edfc564266b7346b6e29ef4861ae937)（[MIT](https://github.com/princeton-nlp/ALCE/blob/246c476a4edfc564266b7346b6e29ef4861ae937/LICENSE)）在事后区分引文联合支持和单个引用的作用。本轮借鉴指标拆分，不复制实现、模型或数据。[源码学习记录](../../notes/LLM笔记/2026-11-17-citation-support.md)。
- [Hugging Face Transformers v4.57.1 的缓存说明](https://huggingface.co/docs/transformers/v4.57.1/cache_explanation)（[Apache-2.0](https://github.com/huggingface/transformers/blob/v4.57.1/LICENSE)）解释为什么因果注意力可以复用过去位置的 K/V，以及增量查询仍需要正确的键长度和位置。这里只用原仓库模型和原创实现，不引入 Hugging Face 运行依赖。

## 文档 RAG

在独立实验目录新增来源片段校验、编号回填、运行器、原始记录及审计测试，不改默认检索、生成或上一版门控。预先冻结 6 个 Flask 原文片段与 16 道中英题（4 个事实，每个含可答与相关但不可答的版本）。两臂看到相同问题和相同顺序的片段，ID 都受相同枚举约束。一臂必须复制完整原文，另一臂只选编号，由程序回填原文。用同一 Qwen3.5-0.8B Q4_0 与 llama.cpp b12359 免费 CPU 环境跑了 **32 次判别、11 次生成**。这是固定证据下的开发对照，不测检索召回，不是外部文档留出或联合多片段任务。

| 指标 | 完整逐字引用 | 编号选择 |
| --- | ---: | ---: |
| 判别输出合同通过（含拒答） | 0/16 | 16/16 |
| 可答题选中支持性证据 | 0/8 | 6/8 |
| 证据不足题正确拒答 | 0/8 | 3/8 |
| 可答题被错误拒答 | 0/8 | 2/8 |
| 证据不足题被放行 | 0/8 | 5/8 |
| 最终交付正确、有据回答 | 0/8 | 0/8 |

逐字臂没有任何有效判别，表中 0 次误拒或误放不代表该策略判断正确。16 个输出全不合格，其中 7 个仅丢失末尾换行，不都算语义错误。编号臂生成 11 次，唯一通过最终合同的答案把文档的 31 天默认值当成现有 cookie 的剩余期限；其余 10 个违反引用或拒答合同。无传输失败。编号能解决原文定位和复写错误，不能验证答案范围或真实性。题目和语义结果由 AI 助理分别审查，不是真人标注；门控不启用，尚不接 Agent。

本地 95 项主测试、6 项历史审计测试、17 项新增测试通过；历史回归与审计复算均一致。[提交](https://github.com/zjDing1024/production-rag-system/commit/7a74ca741ae1e813ec52e95329ba697c7aaa0aa7) · [复现](https://github.com/zjDing1024/production-rag-system/blob/7a74ca741ae1e813ec52e95329ba697c7aaa0aa7/experiments/numbered-spans-v1/README.md) · [详细报告](https://github.com/zjDing1024/production-rag-system/blob/7a74ca741ae1e813ec52e95329ba697c7aaa0aa7/experiments/numbered-spans-v1/REPORT.md) · [逐题结果](https://github.com/zjDing1024/production-rag-system/blob/7a74ca741ae1e813ec52e95329ba697c7aaa0aa7/experiments/numbered-spans-v1/summary.json) · [精确提交 CI](https://github.com/zjDing1024/production-rag-system/actions/runs/43909241217)（Python 3.11/3.12 全通过；只核验已保存记录，不运行模型）。

## Transformer

新增有界 CPU KV cache，会话包含权重快照、prefill/append/reset 和可安装的生成命令。缓存复用过去的 K/V，而新位置仍使用绝对位置和跨新旧键的因果掩码；上下文超限直接报错，不静默截断或重置位置。只支持同长度无填充批次，不改变旧生成器或训练入口。

恢复原始 seed 20261114 的一个训练检查点，两种 SHA-256 核对通过；没有新的选模或 SQLite 评分。对同一组 64 字节序列使用四种分块方式。与完整前缀重算比较，最大绝对 logit 差为 `1.073e-5`，符合预先固定的组合容差 `atol=rtol=1e-5`，并非逐位相等。两条提示各生成 16 个贪心字节，32/32 完全一致。报告跨新进程复跑逐字节一致，本地 163 项测试通过，离线 wheel 安装后在仓库外运行命令成功。没有测提速、吞吐、总内存或语言质量。

[提交](https://github.com/zjDing1024/transformer-from-scratch/commit/ed49949ec73b84cbf7fe47ea3933bf9537c8e466) · [复现说明](https://github.com/zjDing1024/transformer-from-scratch/blob/1d7a4d4f2e085c1f0abc447e3f063590f6c23c71/docs/cached-inference.md) · [逐步数值](https://github.com/zjDing1024/transformer-from-scratch/blob/1d7a4d4f2e085c1f0abc447e3f063590f6c23c71/results/inference-v1/report.json) · [验收记录](https://github.com/zjDing1024/transformer-from-scratch/blob/1d7a4d4f2e085c1f0abc447e3f063590f6c23c71/results/inference-v1/verification.json) · [文档格式修复提交](https://github.com/zjDing1024/transformer-from-scratch/commit/1d7a4d4f2e085c1f0abc447e3f063590f6c23c71) · [最终提交 CI](https://github.com/zjDing1024/transformer-from-scratch/actions/runs/43907421891)（163 项通过；此前 [CI](https://github.com/zjDing1024/transformer-from-scratch/actions/runs/43906930833) 用新版 Ruff 检查 Markdown 代码块失败，只修了两行注释空格，完整 CI 重新通过）。

## 求职价值、边界和下一步

两条工程线分别展示了如何把 RAG 输出格式错误与证据判断错误分开，以及如何用独立参考路径验证推理优化没有改变计算语义。这些是已核验的项目行为，不代表个人已独立实现或掌握；本轮不新增同类 Wine 实验。

下一轮将运行时状态问题与文档默认值问题的语义判别、生成器的引文交付合同分别诊断。先能在新题上交付有据回答并保留正确拒答，再考虑受限只读 Agent。Transformer 的下一项是先冻结同语义的推理基准，再测延迟与内存，不把本轮正确性当速度证据。
