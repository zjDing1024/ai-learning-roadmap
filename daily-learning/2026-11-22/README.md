# AI Engineer Daily Report｜2026-11-22

日期按马来西亚时间（UTC+8）。主题：验证 RAG 请求版本与索引证据的边界，区分 Transformer 缓存预留的空间成本和实际请求时间。

## 独立运行：Express 文档结论是否符合发布包

用锁定的 4.21.2 和 5.1.0 npm 包创建真实应用，而不是只核对文档。新建应用的 `query parser` 分别是 `extended` 和 `simple`。把一个应用显式改成另一个值，不改变同版本的其他旧实例或新实例。两份安装包的 `lib/application.js` 均与对应的 GitHub 版本提交字节一致。Node v24.22.3、npm 11.19.1，在干净目录用锁定依赖离线重装再运行，输出字节一致；这只是设置真值，不是 URL 解析或模型评测。

[原创探针、锁文件和原始结果](../../experiments/2026-11-22-express-runtime/README.md) · [Express 4.21.2 实现](https://github.com/expressjs/express/blob/1faf228935aa0a13111f92c28ee795be64ce3f0f/lib/application.js#L69-L85) · [Express 5.1.0 实现](https://github.com/expressjs/express/blob/cd7d4397c398a3f3ecadeaf9ef6ac1377bd414c4/lib/application.js#L90-L101) · [MIT 许可证](https://github.com/expressjs/express/blob/cd7d4397c398a3f3ecadeaf9ef6ac1377bd414c4/LICENSE)。技术价值：同版本的显式设置不能作为默认值的证据。

## 文档 RAG：错标签会让过滤器准确地检索错材料

新增可选字面版本绑定：先核对问题中唯一明确的完整发布号与调用方提供的文档版本，不改写问题；不一致时不进原管线。绑定成功后，仍须通过原有的索引完整性、同范围及声明审阅等预检。未改默认入口。工程逻辑、重放和原始证据均与上轮真实来源评测分开。

- 英中离线交叉：范围填对时两臂都打包正确范围证据（4/4）；故意交换版本时，原范围过滤 4/4 打包错版本，绑定 4/4 在检索前拦住。翻译配对不算独立样本。
- 英文真实本地 CPU 生成：原范围过滤的正例 2/2 正确且引用支持；错范围 2/2 输出格式合法但事实错误，分别把 4.21.2 答成 `simple`、5.1.0 答成 `extended`，引用了错误版本。开启绑定后正例仍为 2/2，两个错范围均未调用模型。两臂合计 6 次实际调用，模型拒答、无效输出、传输失败均为 0。拦截不是模型学会了拒答。
- 字面比较不能判断「或更新版本」、否定或应用对象，也不是对 scope 来源的认证。即使版本正确，缺目录、同版本错谓词或缺审阅证据仍不应放行。未据此启用 Agent 或宣称泛化。

[工程原理与开源源码](../../notes/LLM笔记/2026-11-22-version-binding-and-benchmarks.md)。

新增 `src/rag_foundation/version_bound.py` 及命令入口，附 `experiments/version-binding-v1/` 冻结输入、原始输出和重放审计；本地 236 项测试通过；精确远端提交在 Python 3.11 和 3.12 的 CI 均通过，CI 仅重放、不调用模型。独立复核了六次请求与回答。 [提交](https://github.com/zjDing1024/production-rag-system/commit/a278717a516b02a0d5d13945d567d87a537d1bac) · [运行及复核说明](https://github.com/zjDing1024/production-rag-system/blob/a278717a516b02a0d5d13945d567d87a537d1bac/experiments/version-binding-v1/README.md) · [六次真实调用记录](https://github.com/zjDing1024/production-rag-system/blob/a278717a516b02a0d5d13945d567d87a537d1bac/experiments/version-binding-v1/recorded-live.json) · [精确提交 CI](https://github.com/zjDing1024/production-rag-system/actions/runs/44923480127)。

## Transformer：少拼接不等于请求更快

为已可运行的动态与预分配 KV 缓存新增无 profiler 的配对计时入口。固定 99,968 个未训练参数、float32、上下文 64、同样的两个批量请求和同样的生成函数。正式运行在一台共享云 CPU 上对进程单逻辑核绑核并先于 PyTorch 导入，且限制 Torch/BLAS 线程；不是硬件独占。每格 6 对预热、30 对有效样本，各轮交替先后；共 150 对（300 次范围内调用）。预热、输出核对和存储盘点不计入这 300 次。首轮不满足导入顺序，作为偏差单独保留，未纳入下表。

| 请求范围 | 动态中位耗时 | 预分配中位耗时 | 同对预分配／动态比的中位数 |
| --- | ---: | ---: | ---: |
| 只构造会话 | 2.10 ms | 2.12 ms | 1.015 |
| 批 2 / 前缀 16 / 新增 16，新会话 | 13.15 ms | 13.58 ms | 1.051 |
| 同短请求，复用会话 | 10.75 ms | 11.75 ms | 1.065 |
| 批 2 / 前缀 32 / 新增 32，新会话 | 26.42 ms | 27.24 ms | 1.064 |
| 同长请求，复用会话 | 22.05 ms | 23.13 ms | 1.048 |

新会话计入构造，复用会话计入重置。两种缓存和完整前缀在计时前后生成的 96 个新字节一致，逐步 logits 符合组合容差。预分配会话始终持有 128 KiB KV 张量存储，动态会话在这两种请求结束时的持有量为 63,488 / 129,024 B，重置后不再持有 KV 张量存储；这不是进程峰值或释放物理内存。配对中位数未显示预分配更快，维持动态默认。结果不是算子归因、训练质量、GPU、服务并发或跨硬件结论。

新增 `src/transformer_diagnostics/cache_tradeoff.py`、固定协议与原始计时、可安装命令和离线审计。320 项本地测试、格式与编译通过；在仓库外安装 wheel 后，实际固定权重核对和原始记录审计均通过。PyTorch Timer 的[预热和重复测量设计](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/torch/utils/benchmark/utils/timer.py#L66-L96)是方法参考（[上游许可证](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/LICENSE)），计时器独立实现。

[提交](https://github.com/zjDing1024/transformer-from-scratch/commit/8ac51f6a70adea5206123582fc3696e4e64850e5) · [复现说明](https://github.com/zjDing1024/transformer-from-scratch/blob/8ac51f6a70adea5206123582fc3696e4e64850e5/docs/cache-tradeoff.md) · [原始结果](https://github.com/zjDing1024/transformer-from-scratch/blob/8ac51f6a70adea5206123582fc3696e4e64850e5/results/cache-tradeoff-v1/report.json)。

## 求职价值、能力边界与明日方向

- LLM / AI Engineer：展示一个实际发生的错版本回答、它为何同时满足旧格式合同，以及怎样把版本不一致变成可检查的无调用结果。下一步优先用 Cargo 工作区 resolver 作为独立事实，测试「版本对、对象或谓词错」及目录不完整；先完善可信范围注册表，再做受限只读 Agent。
- 推理工程：展示如何在同输出条件下区分构造、复用与已留存存储，并保留没有加速的结果。下一步优先把推理路径做成可一键复跑的交付，不为提高某个单机数字反复微调。
- 本轮验证的是项目运行与实验设计，不代表本人已独立复现或掌握；不另布置自测，不阻塞推进。[PyTorch 训练到推理主路径](https://github.com/zjDing1024/pytorch-from-zero/commit/d81080d81c2ffdf6db7e699c6903ccd5e142f538)未改，本轮没有新建仓库、付费资源或上线部署。
