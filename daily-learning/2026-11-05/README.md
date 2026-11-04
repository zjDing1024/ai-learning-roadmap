# AI Engineer Daily Report

日期：2026-11-05，Asia/Kuala_Lumpur（触发：2026-11-04 16:00 UTC）。阶段 1：深入 PyTorch。

## 今日学习主题与研究项目

先核对任务书、最新路线、实验及 11 月 4 日双预算日报。前次已完成 batch16／32 等样本与等更新对照，本轮不重复搜参，而补齐“两个预算都不等实际计算成本”的计量缺口。路线中的 update-clock scheduler 保留为未实施候选；本次选择成本测量，承接此前总结提出的下一步。

研究 [PyTorch Benchmark Utils](https://docs.pytorch.org/docs/2.14/benchmark_utils.html) 的预热、线程控制和重复计量设计，参考 [Python time](https://docs.python.org/3.12/library/time.html) 的两个时钟语义。项目维护者、固定官方源码及 BSD-style 许可见[原创研究笔记](../../notes/深度学习笔记/2026-11-05-batch-compute.md)。实现为本任务原创，不复制上游代码；使用已有 UCI Wine 及 CC BY 4.0 来源，不购买算力或引入收费资源。

## 实际完成内容

工程代码继续进入已有独立项目 `pytorch-from-zero`，新增 `wine_batch_compute.py`、CLI、冻结协议、原始计时结果与测试，更新 README 和交付入口；学习笔记与日报集中于本仓库。不为一次计量增量新建空仓库。

固定两模型、三个种子和三个既有训练分支，每一条参考／预热／测量轨迹均从原始初始化重新开始。三分支分别为 batch16 的 14 更新／214 访问、batch32 的两轮 8 更新／214 访问，以及 batch32 的 14 更新／385 访问。

- 每配置三条参考、一轮每分支预热、三轮轮换顺序的正式测量。
- 总计 18 参考 + 18 预热 + 54 测量 = **90 轨迹、1080 更新、24390 训练访问**。
- 90 次完整训练集终点评估，另计 **9630 评估样本访问**。正式测量不是全部成本，独立测试和交付另有重复成本。
- 计时仅覆盖 prepared-batch 更新循环的 zero_grad、forward、CE、backward、SGD.step；导入、初始化、索引准备、评估、哈希与参考验证在计时外。Python 循环及计时调用开销仍在。
- 固定 CPU float64／单线程，三次同进程测量记录 min／median／max，不作统计显著性检验，不设谁更快的通过门。

## 原始结果

本地 Python 3.12.14、Torch 2.14.1+cpu、x86_64。单次主 JSON SHA-256：`49575f8e2eb37cc08fd9c38fcb294044a472c14cf16a04b6ff12037c61ca3831`。全部 72 条预热／测量路径的最终参数、训练 CE 和行顺序都与相应参考精确相同，预算检查通过。原始 JSON 保存单次读数，下面单位均为毫秒，仅描述这个宿主上的这次测量。

| 模型 | seed | 分支 | wall min | wall median | wall max | process CPU median |
|---|---:|---|---:|---:|---:|---:|
| linear | 42 | batch16_14updates | 2.163211 | 2.332918 | 2.717620 | 2.329909 |
| linear | 42 | batch32_2epochs | 1.451385 | 1.544055 | 1.672459 | 1.541429 |
| linear | 42 | batch32_14updates | 2.152145 | 2.529656 | 2.715857 | 2.527202 |
| linear | 7 | batch16_14updates | 2.670909 | 2.728166 | 4.234404 | 2.725767 |
| linear | 7 | batch32_2epochs | 1.327288 | 1.637596 | 1.821144 | 1.635097 |
| linear | 7 | batch32_14updates | 2.904813 | 3.244397 | 3.597441 | 3.241573 |
| linear | 123 | batch16_14updates | 2.038573 | 2.587784 | 3.290816 | 2.584627 |
| linear | 123 | batch32_2epochs | 1.297803 | 1.374508 | 1.869637 | 1.371777 |
| linear | 123 | batch32_14updates | 2.239176 | 2.802417 | 2.836860 | 2.800087 |
| mlp16 | 42 | batch16_14updates | 3.163294 | 3.362304 | 4.526876 | 3.359718 |
| mlp16 | 42 | batch32_2epochs | 2.323124 | 2.443205 | 2.593632 | 2.440564 |
| mlp16 | 42 | batch32_14updates | 3.575398 | 3.642659 | 6.421551 | 3.640084 |
| mlp16 | 7 | batch16_14updates | 3.456948 | 3.581176 | 4.601129 | 3.578303 |
| mlp16 | 7 | batch32_2epochs | 1.636425 | 2.526341 | 2.535865 | 2.523186 |
| mlp16 | 7 | batch32_14updates | 3.731873 | 3.887719 | 4.370370 | 3.883906 |
| mlp16 | 123 | batch16_14updates | 2.911523 | 3.058735 | 3.540484 | 3.056357 |
| mlp16 | 123 | batch32_2epochs | 1.904220 | 1.964431 | 2.391196 | 1.961873 |
| mlp16 | 123 | batch32_14updates | 3.230315 | 3.302454 | 3.734698 | 3.300149 |

在本次全部六配置中，batch32 两轮分支 wall 中位数较低，但它仅有 8 次更新，训练终点 CE 也较高；不能因此推荐它为最优。等 14 次更新时 batch32 的访问数更多，本次 wall 中位数也较高；共享宿主与短时噪声未受控，不报告稳定加速比或端到端性能排名。两种时钟读数相近也不等于不存在调度噪声。

## 独立审查

四项独立测试实际通过（5.11 秒）：三分支用确定性时钟 spy 核对 wall-start／CPU-start／CPU-end／wall-end 顺序，真实执行 forward、backward 与 SGD，验证训练处于计时内、最终评估和 digest 在外。测试中的 1000 ns／700 ns 是合成输入，绝不是性能数据。

另一次完整实验污染留出特征和标签并守卫所有 forward，直接计数 1080 更新、24390 训练访问和90次完整训练评估；全局 CPU RNG、调用者线程数保持。轮换顺序确保每分支在每个测量位置各出现一次；中位数从正式三次而非预热重新计算。带守卫的测试增加开销，不用于报告计时。

独立测试初次 lint 的导入顺序／行长问题已修正并重跑，未改科学预算或阈值。全部四项纳入总测试数，不重复累计。

## 技术理解与求职价值

1. 成本需明确计时区域，不能把已准备张量上的更新循环叫作端到端训练；排除评估和哈希会改变测到的工作，却不应改变训练结果。
2. wall 和 process CPU 回答不同问题，返回单位为 ns 不意味着观测精度达到 ns。
3. 重复从同一状态运行可核对科学结果；计时自然波动，不要求每次秒数一致，也不为绿色 CI 调整性能阈值。
4. 等更新／等样本／等时间是三个不同合同。批大小改变动量与衰减应用次数或数据暴露，不能由一次短时结果宣称普遍训练效率优势。

对应 AI／ML Engineer 的实验计量、训练工具维护及可靠交付。已验证能力是本次代码的预算核算、状态对照和交付测试；本人可选巩固是独立解释计时区间与两种时钟，练习不作为继续推进门槛。没有 GPU、AMP、分布式、泛化提升或生产吞吐证据。

## 实际验收与 GitHub

本地最终完整主套件 **1887 passed，419.42 秒**；另三套 59／45／34 项分别通过，总计 **2025 = 1887 + 59 + 45 + 34**。新增35项（11核心、20CLI、4独立），已包含在主套件内。Ruff lint／最终195文件格式检查、compileall及pip check通过。

全新非 editable wheel 使用10个离线哈希锁定依赖，53个包文件在source／wheel／安装目录逐字节相同。在无关目录实际执行22个已安装CLI全部通过。新实验的科学字段投影（参数状态、CE、预算、phase／repeat）与本地source一致，计时字段自然不同且排除在相等断言之外。没有执行本地Docker，也没有安装环境全量pytest。

开发阶段聚焦测试首次30通过／1失败：新入口预期下标仍为20而不是21，修正该集成位置与source artifact文件名后31项通过；lint格式问题也已修正。恢复历史Markdown时，初次shell插值损坏反引号，逐blob比对发现后改用安全文字写入恢复原字节，最终清单不含历史改写。未放松数值阈值、训练预算、超时或性能门槛。主测试与安装检查在共享宿主并行，发布的原始计时在它们之前运行，不能用后续测试耗时倒推实验运行性能。

本轮工程23文件变更（12修改、11新增），最终树391文件，无删除。工程提交 [feb37e8f502f0ac6e17d80acc0d1113236761976](https://github.com/zjDing1024/pytorch-from-zero/commit/feb37e8f502f0ac6e17d80acc0d1113236761976) 已在 main，391个远端文件与最终清单逐blob一致。学习仓库基线为 `97bc4b3422863f40815b213de1ae961a3e25cb08`，51个基线文件逐blob恢复核验；保留历史日报，新增今日报告／研究笔记并更新四个索引。

- [核心实现](https://github.com/zjDing1024/pytorch-from-zero/blob/feb37e8f502f0ac6e17d80acc0d1113236761976/src/pytorch_lab/wine_batch_compute.py)
- [冻结协议](https://github.com/zjDing1024/pytorch-from-zero/blob/feb37e8f502f0ac6e17d80acc0d1113236761976/docs/wine-batch-compute-plan.json)
- [原始JSON](https://github.com/zjDing1024/pytorch-from-zero/blob/feb37e8f502f0ac6e17d80acc0d1113236761976/results/2026-11-05-wine-batch-compute.json)
- [完整本地验收](https://github.com/zjDing1024/pytorch-from-zero/blob/feb37e8f502f0ac6e17d80acc0d1113236761976/results/2026-11-05-batch-compute-verification.md)
- [独立审查](https://github.com/zjDing1024/pytorch-from-zero/blob/feb37e8f502f0ac6e17d80acc0d1113236761976/results/2026-11-05-batch-compute-independent-review.md)
- [安装wheel汇总](https://github.com/zjDing1024/pytorch-from-zero/blob/feb37e8f502f0ac6e17d80acc0d1113236761976/results/2026-11-05-compute-installed-wheel-summary.json)

精确提交 [CI #41866083785](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/41866083785) 已完成且 **success**，source 与 installed-cpu-container 两作业成功。

- 远端source实际 **2025 = 1887 + 59 + 45 + 34** 测试通过，主套件384.59秒；Ruff lint／**196文件**格式通过。远端196与本地195是不同执行记录，不回写混同。
- 实际执行 **22个source CLI**，真实Docker中 **22个已安装CLI** 通过；容器没有运行全量pytest，不能将source测试数称为容器测试。
- 两份artifact已实际下载，API SHA-256与ZIP CRC通过；source24个JSON，container1份完整报告。两处新实验都为六配置、1080更新、24390训练访问、90次训练评估，全部科学检查通过。
- source Python3.12.16，container3.12.14，均Torch2.14.1+cpu。每个环境内部的参考匹配通过；计时自然变化，不宣称跨环境完整JSON逐位相等，不以某环境更快作结论。
- 保留缺少可选NumPy、GitHub Action Node20自动使用24及相关弃用提示；镜像构建的pip root警告不代表实际验收以root运行。
- 旧完整Wine benchmark由交付套件另行运行，包含留出评分；它没有反馈到本次计量配置。新实验只评估训练集。
- 学习仓库没有工作流，不宣称它的CI通过；本次不新建仓库，不发布其他私有内容或敏感信息。

## 不足与明日计划

三次同进程重复无法消除共享宿主干扰，也未测端到端加载或完整 epoch 管线。下一项应回到有明确时钟的真实训练学习率对照，在固定 optimizer update 数和样本顺序下冻结 schedule，记录实际使用的学习率与状态，不重复旧合成 StepLR 示例，不按历史测试集选参数。该项尚未实施。
