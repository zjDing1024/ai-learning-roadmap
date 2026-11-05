# AI Engineer Daily Report

日期：2026-11-06（Asia/Kuala_Lumpur，UTC+8）。实验协议的 UTC 日期为 2026-11-05，两者指向同一轮工作。

## 今日学习主题

在真实 Wine 训练中明确学习率的 optimizer-update 时钟，区分本步使用值与下一步准备值，并跨衰减边界恢复完整训练状态。承接 11-05 的成本计量与此前双预算实验，不重复旧合成 StepLR 演示。

## 今日研究项目与技术价值

项目：[PyTorch](https://github.com/pytorch/pytorch)，维护者为 PyTorch 社区与贡献者。它解决张量计算、自动微分与训练组件的组合问题，适合当前阶段深入阅读训练状态而非跳转新框架。

本次实际阅读 v2.14.1 的 [lr_scheduler.py](https://github.com/pytorch/pytorch/blob/v2.14.1/torch/optim/lr_scheduler.py) 与 [optimizer.py](https://github.com/pytorch/pytorch/blob/v2.14.1/torch/optim/optimizer.py)：前者包含 LRScheduler 初始化、step、state_dict 和 StepLR，后者包含优化器参数组与恢复接口。值得借鉴的是显式调用时钟、分离 scheduler 状态与 optimizer 状态、先构造 scheduler 再加载优化器学习率。源码遵循 [PyTorch LICENSE](https://github.com/pytorch/pytorch/blob/v2.14.1/LICENSE) 的 BSD 风格及分组件声明；这里只引用官方链接并原创实现实验，不复制上游代码。

## 实际完成内容

- [核心实现](https://github.com/zjDing1024/pytorch-from-zero/blob/98c55d4b4bbe08567f6170e4358a840034e45698/src/pytorch_lab/wine_update_schedule.py)：独立、限定 CPU 的实验执行器；记录实际 LR、参数更新范数、参数与动量摘要、批次行序列。
- [冻结协议](https://github.com/zjDing1024/pytorch-from-zero/blob/98c55d4b4bbe08567f6170e4358a840034e45698/docs/wine-update-schedule-plan.json)：先确定两架构、三种子、batch16／32、每分支14更新、constant／step7 两组和恢复切点6／7／8。
- [原始结果](https://github.com/zjDing1024/pytorch-from-zero/blob/98c55d4b4bbe08567f6170e4358a840034e45698/results/2026-11-06-wine-update-schedule.json)：12配置、24完整对照轨迹、36恢复后缀；全部科学检查通过。
- 完整状态恢复包括模型、SGD 动量与参数组、scheduler、批次顺序和已完成轨迹。只允许成功完成更新的边界；失败中间态不能继续或保存为有效快照。
- 学习仓库新增本日报与[技术笔记](../../notes/深度学习笔记/2026-11-06-update-clock-scheduler.md)，更新路线、实验索引与能力边界。没有为同一能力重复建仓库。

## 协议、预算与实际结果

使用已有训练划分107行，仅训练集拟合标准化；CPU float64、单线程，Python 3.12.14、PyTorch 2.14.1+cpu。SGD lr=0.05、momentum=0.9、weight_decay=0.0001。每种架构／种子／batch 配置内两分支共享初始化与样本顺序，只改变调度。

每步先 optimizer.step 再 scheduler.step。step7 的第1至7步使用0.05，第8至14步使用0.025；第7步完成后准备0.025，第14步完成后准备0.0125，但本轮没有第15步，不能说0.0125用于训练。

总实际工作为 **588次优化器更新、12486次训练样本访问、60次训练终点评估（6420次评估样本访问）**，恢复后缀也计入，不能只报24×14=336。每条完整 batch16 轨迹访问214行，batch32访问385行；等更新不等样本／算力。两组的前7步参数状态相同，所有LR时钟公式与6／7／8切点的后续完整状态对照通过。

下表是每条完整轨迹第14步后的训练 CE，非验证或测试分数：

| 架构 | 种子 | Batch | constant | step7 |
|---|---:|---:|---:|---:|
| linear | 42 | 16 | 0.089011770 | 0.127325750 |
| linear | 42 | 32 | 0.092114797 | 0.130636543 |
| linear | 7 | 16 | 0.110586373 | 0.164349302 |
| linear | 7 | 32 | 0.100067593 | 0.150414301 |
| linear | 123 | 16 | 0.100532319 | 0.141069160 |
| linear | 123 | 32 | 0.096599128 | 0.139630521 |
| mlp16 | 42 | 16 | 0.263910925 | 0.457749718 |
| mlp16 | 42 | 32 | 0.262344683 | 0.458127779 |
| mlp16 | 7 | 16 | 0.261625596 | 0.429749383 |
| mlp16 | 7 | 32 | 0.259725422 | 0.425199143 |
| mlp16 | 123 | 16 | 0.201472918 | 0.393564078 |
| mlp16 | 123 | 32 | 0.212725598 | 0.412303171 |

12配置的 step7 训练CE均较 constant 高。在这段短前缀中，提前降低学习率没有取得更低训练CE；这不是 scheduler 无用的结论，不用它选择最终模型，不宣称泛化、长期收敛或稳定性优势。本轮不读取留出评分，不调参、不搜索更有利的衰减点。

## 技术理解

1. StepLR 的 last_epoch 是接口名；本实验每次成功 optimizer update 后调用一次，因此它在这里计数更新而非完整数据轮次。batch16和32的第7次更新看过的样本数不同。
2. scheduler.state_dict 排除 optimizer；只恢复 scheduler 或只保存 last_epoch 均不足以恢复 SGD 动量和参数组的实际LR。恢复必须对应同一个训练边界。
3. LR衰减是改变未来参数路径，不会把既有动量缓冲直接减半；在分岔后，未来梯度也随参数改变，不能把整段轨迹理解成恒定比例缩放。
4. 逐步完整状态比较比只检查终点loss更强，但仍是同进程可信内存对象的恢复验证，不等于文件持久化、崩溃恢复或跨运行时逐位复现。

## 验收与 GitHub

本地最终完整主套件 **1926 passed，576.06秒**；加独立59／45／34项，共 **2064项唯一测试通过**。最终python -I -m pytest -q针对已核对路径的本轮源码执行。

三套独立验收分别59通过（8.33秒）、45通过（12.67秒）、34 unittest通过（1.993秒）。新实验聚焦39项最终通过（8.85秒），其中含1项独立测试，已包含在主套件数内，不重复累计。

独立审查以不调用本实验step或scheduler的手写SGD递推，核对全部168次scheduled更新的参数／动量摘要；12条constant轨迹与既有batch-budget实现一致。污染非训练行、forward守卫和实际调用spy验证train-only与预算，调用者CPU RNG保持。

Ruff、格式、compileall及pip check通过。fresh非editable wheel离线安装10个锁定依赖，55个包文件在source／wheel／安装目录逐字节一致；从无关临时目录实际执行23个已安装CLI全部通过，同一宿主的新实验完整JSON与source相同。没有本地Docker或安装环境全量pytest。旧Wine完整benchmark由交付检查另行运行，含留出评分，未用于选择本实验设置。

首次主套件因复用解释器的editable仍指旧checkout而中止，不计通过；修正绑定并核对python -I导入路径后整套重跑。首次独立unittest从错误cwd调用无法import，改到其tools/wine-delivery目录后34项通过。新代码及独立测试初次lint问题已修正，没有放宽数值阈值。缺少可选NumPy提示保留。

[完整本地验收](https://github.com/zjDing1024/pytorch-from-zero/blob/98c55d4b4bbe08567f6170e4358a840034e45698/results/2026-11-06-update-schedule-verification.md) · [独立审查](https://github.com/zjDing1024/pytorch-from-zero/blob/98c55d4b4bbe08567f6170e4358a840034e45698/results/2026-11-06-update-schedule-independent-review.md) · [安装wheel摘要](https://github.com/zjDing1024/pytorch-from-zero/blob/98c55d4b4bbe08567f6170e4358a840034e45698/results/2026-11-06-update-schedule-installed-wheel-summary.json)

工程 main 已核验为下列提交，402个远端文件的blob与mode匹配最终清单；24个变更，含11新增，无删除。

精确工程提交的 [CI #42064073967](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/42064073967) 已完成且 **success**，source 与 installed-cpu-container 两作业均成功。

- 远端source主套件1926通过（344.32秒），独立59／45／34分别4.32／4.41／1.178秒，共2064项；Ruff lint与204文件格式检查通过，23个source CLI执行步骤成功。
- 真实container执行23个已安装CLI成功。没有容器全量pytest，不把2064个source测试说成容器测试。
- 两份artifact实际下载，API SHA-256与ZIP CRC验证通过；source含25个JSON，container含1份完整报告。两处新实验均为12配置、588更新／12486训练访问／60评估／6420评估访问，全部科学检查通过。
- source Python3.12.15，container Python3.12.14，均Torch2.14.1+cpu。source与container本次configurations字段精确相同，但与本地存在末位差异，最大训练终点CE绝对差为5.551115123125783e-17。每个环境内部完整恢复通过；不宣称跨环境完整JSON或全部结果逐位相同。
- 12配置均保持constant短前缀训练CE更低的观察，不因此取得泛化或生产性能证据。学习仓库无工作流，不宣称其CI通过。

学习记录首个发布提交为 [577c53173fe1a60ff8af5237521d6338aae2e24f](https://github.com/zjDing1024/ai-learning-roadmap/commit/577c53173fe1a60ff8af5237521d6338aae2e24f)，远端55个文件经核对：48个未改文件与基线blob／mode相同，7个修改／新增文件与本地发布内容的git blob哈希和mode匹配。当前补充只更新本日报的实际CI终态。

工程提交：[98c55d4b4bbe08567f6170e4358a840034e45698](https://github.com/zjDing1024/pytorch-from-zero/commit/98c55d4b4bbe08567f6170e4358a840034e45698)。发布前学习仓库基线为240eee4c5513e7f3ec82860ffa23a8b43d311843，最新已有日报为11-05，未覆盖历史日报。仅发布本任务原创代码与技术记录，未使用收费资源或公开既有私有内容。

## 求职价值与当前能力变化

对应 AI／ML Engineer 的可审计训练循环、调度合同、状态恢复和实验控制能力。已验证的是本轮助理实现的代码／实验与验收结果，**不等于用户本人已掌握**。

本人可选自测：不看答案列出第6至8步的 lr_used／lr_next；解释遗漏 optimizer state 为什么破坏动量恢复；修改衰减切点后先写预测再运行。练习用于巩固，不作为继续工程推进的门槛。

## 不足与明日计划

当前只覆盖固定 Wine CPU 模型、可信内存快照和完整更新边界，没有通用 JointTrainer 集成、文件损坏检测、新进程恢复、GPU／AMP／DDP，也不以训练CE推断泛化。

下一步候选：冻结更长训练预算、训练／验证曲线记录与终点选择规则，检查短前缀结论是否随训练阶段改变。先定义验证集用途与停止标准，不依据历史测试集选择策略；不再追加仅更换衰减点的同类短前缀实验。该下一项尚未实施。
