# AI Engineer Daily Report｜2026-11-24

按马来西亚时间（UTC+8）。计划起点 11 月 23 日 16:00 UTC，即 **11 月 24 日 00:00 MYT**。本轮运行 SQLite 证据归因对照，另补录此前的 Transformer 便携交付；二者不是同一执行批次。

## 文档 RAG：数值相同不代表引用支持

固定一道问题，目标是 `main.measurement.derived` 的 `table_xinfo.hidden`。受信的测试夹具知道此题的预期范围；它不是开放文本解析，也不是生产设置。错对象沿用 `temp` 的 `hidden=3`，错字段沿用 `main` 的 `cid=3`。两个错范围的目录内仍有正确证据，旧路径却真实命中 BM25 并将错证据打包。缺字段的完整目录只有 `table_info` 材料；绑定通过后仍应返回 `no_matching_scope`，不与绑定拦截或模型拒答混算。

| 同题四种情况 | 原版本与目录路径 | 增加夹具范围绑定 |
| --- | ---: | ---: |
| 数值及证据均正确的计划 | 1 | 1 |
| 数值恰好正确但证据不支持 | 2 | 0 |
| 排名前因范围错配拦截 | 0 | 2 |
| 无匹配范围 | 1 | 1 |
| 实际模型调用 | 0 | 0 |

数值来自被选中的夹具候选，不是模型答案。资料库是据 SQLite **3.46.1** 源码制作并显式标注的合成摘要；独立 DDL/PRAGMA oracle 则在 Python 链接的 SQLite **3.53.1** 上真实运行，两者不混称。两个 STORED 探针均为 `(cid, hidden)=(3,3)`，另有 VIRTUAL 对照 `(3,2)`，不另计检索样本。`table_info` 不返回生成列。3.53.1 源码的 Fossil origin 与运行时 source ID 对应；SQLite 为公共领域。

在固定提交的 RAG 仓库运行 `python experiments/sqlite-attribution-v1/replay.py --check`，可离线逐字节核对冻结结果；`--oracle` 使用本机 SQLite，版本可能不同。241 项本地测试通过（148 核心、88 历史实验、5 新增），历史审计及本机 oracle 逐字节复跑通过。[复现与来源](https://github.com/zjDing1024/production-rag-system/blob/66079c90d0513845181143e6730fb69effb63dd8/experiments/sqlite-attribution-v1/README.md) · [冻结重放](https://github.com/zjDing1024/production-rag-system/blob/66079c90d0513845181143e6730fb69effb63dd8/experiments/sqlite-attribution-v1/replay.json) · [独立运行真值](https://github.com/zjDing1024/production-rag-system/blob/66079c90d0513845181143e6730fb69effb63dd8/experiments/sqlite-attribution-v1/runtime-oracle.json) · [提交](https://github.com/zjDing1024/production-rag-system/commit/66079c90d0513845181143e6730fb69effb63dd8) · [精确提交 CI：Python 3.11 / 3.12 均通过离线重放](https://github.com/zjDing1024/production-rag-system/actions/runs/45212797778)。这是一组受控事实，未改默认路径，未启用 Agent，不代表模型准确率、学会拒答或通用安全保证。

## Transformer：无需检查点的单命令推理检查（补录）

GitHub 记录原发布提交为 11 月 22 日 16:14 UTC，即 **11 月 23 日 00:14 MYT**。本节归档现存交付与 CI，不算作 11 月 24 日的重新运行。

在固定提交的 Transformer 仓库安装后运行：

```sh
python -m pip install .
transformer-portable-generate --prompt-text '中' --count 1 --max-context 4
```

也可用 `--prompt-hex e4b8ad` 替换 `--prompt-text '中'`。两种输入对应同一 3 字节前缀，记录输出都是 `e4b8ad47`；4 是前缀加新字节的总预算。预算降为 3 时拒绝生成 1 字节，生成 0 字节则保留前缀。每次恢复相同的未训练 CPU 固定权重，逐步对比缓存与完整前缀的 logits 和贪心字节；默认英文命令的保存记录是 16 输入与 16 新字节，和此中文边界样例分别留证。旧的 checkpoint CLI 和 JSON v1 不变。

[安装与运行](https://github.com/zjDing1024/transformer-from-scratch/blob/8599bb5e50cf50e6a612f997c90e5f4ebb8a8fb9/docs/portable-handoff.md) · [保存的默认报告](https://github.com/zjDing1024/transformer-from-scratch/blob/8599bb5e50cf50e6a612f997c90e5f4ebb8a8fb9/results/portable-handoff-v1/report.json) · [发布提交](https://github.com/zjDing1024/transformer-from-scratch/commit/8599bb5e50cf50e6a612f997c90e5f4ebb8a8fb9) · [精确 CI 通过](https://github.com/zjDing1024/transformer-from-scratch/actions/runs/45042706330)。历史运行记录包括 330 项本地测试及仓库外已安装 wheel 的 UTF-8 路径验证。本次只核验并归档现存资料；不据此推断语言能力、训练质量、加速、RSS 或跨平台一致性。

## 作品集价值与下一步

[RAG 的 Cargo 证据审计](../2026-11-23/README.md)已纳入项目首页，从短路径可离线核对固定来源的正反例。PyTorch 继续保留既有交付，未重做 Wine 实验。这次 RAG 例子可展示如何在同一个数值下审查引用究竟指向什么；Transformer 例子则给审阅者一条只依赖固定权重的实际命令。RAG 后续用独立事实与更广来源检查可信绑定的覆盖及误放行，再讨论受限只读 Agent。工程证据不作为个人熟练度认定。
