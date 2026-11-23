# AI Engineer Daily Report｜2026-11-23

这份日报按马来西亚时间（UTC+8）的 11 月 23 日计划批次归档，于 11 月 24 日补录到路线仓库。下列两项工程提交与 CI 实际都发生在 11 月 22 日 UTC、当日下午 MYT；这不是在 11 月 23 日重新执行。

## 文档 RAG：Cargo resolver 先看工作区根

研究 Cargo 0.86.0 的根包定位、edition 默认映射和虚拟工作区回退。四条完整证据分别支持：根包 edition 2021 → 2、根包 edition 2024 → 3、虚拟根只有 edition 2024 的成员且未指定 resolver → 1、虚拟根显式指定 → 3。另有两条不足证据：只给成员 edition，或只说明虚拟根需要显式设置，都不能支持数值 1。即使数值碰巧答对，证据指向了错误对象也不能算有据。

这是固定来源、预先固定证据范围的离线审计；4/4 支持行、2/2 不支持行是保存的审计标签，不是模型性能、Cargo 运行时或检索链路验收。在 RAG 仓库固定提交下运行：

```sh
python experiments/cargo-resolver-v1/audit.py --check
```

[审计入口](https://github.com/zjDing1024/production-rag-system/blob/d28bce80b6bfb58e678a6a4fd78550b14d3462bc/experiments/cargo-resolver-v1/README.md) · [冻结汇总](https://github.com/zjDing1024/production-rag-system/blob/d28bce80b6bfb58e678a6a4fd78550b14d3462bc/experiments/cargo-resolver-v1/summary.json) · [发布提交](https://github.com/zjDing1024/production-rag-system/commit/d28bce80b6bfb58e678a6a4fd78550b14d3462bc) · [精确 CI：Python 3.11 / 3.12，Cargo 审计均通过](https://github.com/zjDing1024/production-rag-system/actions/runs/44988689500)。GitHub 记录该提交为 11 月 22 日 05:16 UTC（13:16 MYT）。依据是 Cargo [固定源码](https://github.com/rust-lang/cargo/tree/d73d2caf9e41a39daf2a8d6ce60ec80bf354d2a7)（MIT OR Apache-2.0），实验只保留原创事实摘要，不复制源码。

## Transformer：UTF-8 是字节边界，不是语言质量

新增独立的 `transformer-utf8-check`，重建未训练 CPU 固定权重，不读取旧检查点。输入 `中` 计 3 字节（`e4b8ad`），新增 1 字节的缓存与完整前缀结果一致（`e4b8ad47`）；容量为 3 时，多请求 1 字节被拒绝，请求 0 字节仍返回原前缀。旧 checkpoint 命令及八键 JSON v1 保持不变。检验的是机器字节、容量边界与兼容性，不检验中文生成或性能。

[运行说明](https://github.com/zjDing1024/transformer-from-scratch/blob/7082d423786863a3744e40e775c988d813a544e1/docs/utf8-fixture.md) · [保存的 JSON](https://github.com/zjDing1024/transformer-from-scratch/blob/7082d423786863a3744e40e775c988d813a544e1/results/utf8-v1/report.json) · [发布提交](https://github.com/zjDing1024/transformer-from-scratch/commit/7082d423786863a3744e40e775c988d813a544e1) · [精确 CI 通过](https://github.com/zjDing1024/transformer-from-scratch/actions/runs/44988848920)。GitHub 记录该提交为 11 月 22 日 05:18 UTC（13:18 MYT）。历史运行记录包含 325 项本地测试与仓库外 wheel 检查；本次补录未重跑。

## 取舍和后续

RAG 先用新事实区分「版本正确、对象错误」和「对象正确、所需字段缺失」，并把证据支持与值命中分开，未新增 Agent。Transformer 后续将固定边界例扩展成接受自定义字节输入的一条命令，见[便携交付补录](../2026-11-24/README.md)。PyTorch 主路径未变。
