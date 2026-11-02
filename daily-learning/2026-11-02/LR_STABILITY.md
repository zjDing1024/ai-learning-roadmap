# AI Engineer Daily Report：2026-11-02 学习率稳定性增量

时区：Asia/Kuala_Lumpur。同日第三项增量，接续[训练诊断](TRAINING_DIAGNOSTICS.md)，较早的[随机联合恢复](README.md)保持独立记录。

## 当前主题与研究

训练信号诊断已经区分“没有梯度”和“有梯度但无更新”；本项继续解释“确实更新，为什么仍振荡或发散”。先推导固定二次损失的曲率与误差递推，再按冻结计划执行训练，不根据结果挑选好看的学习率。

读取当前路线、实验记录及官方 [PyTorch](https://github.com/pytorch/pytorch) 的 SGD／autograd 源码和 BSD 风格三条款许可证。具体固定版本、结构及原创数学推导见[学习笔记](../../notes/深度学习笔记/2026-11-02-lr-stability.md)。未复制上游代码或增加训练框架依赖。

## 预声明设计

五个输入为 [-1, -0.5, 0, 0.5, 1]，目标 y=2x+0.5；仿射模型从权重、偏置均为零开始，使用 CPU float64、无 momentum／weight decay 的 SGD。四个学习率 0.1、0.75、1.0、1.25 各运行 12 步，共 48 个实际更新。

该损失为 L=0.5(w−2)²+(b−0.5)²，Hessian 的两个特征值为 1、2。权重和偏置误差倍率分别为 1−α、1−2α；全部方向渐近收敛的解析范围为 0<α<1。闭式轨迹与实际训练采用预声明 atol=rtol=1e-12 核对，有限步实验不是无限时间浮点证明。

已有训练诊断配置的学习率范围未改变，新增独立稳定性模块、配置和 CLI；没有为此放宽旧功能合同。

## 实际主实验结果

所有初始 loss 均为 2.25。下列值直接读取原始报告，不是预计结果。

| 学习率 | 第一步后 loss | 第 12 步后 loss | 观察与解析对应 |
|---|---:|---:|---|
| 0.1 | 1.78 | 0.16071347777446246 | 两方向误差同号缩小，loss 下降 |
| 0.75 | 0.1875 | 1.4901168299275014e-08 | 偏置误差交替变号但幅度缩小，loss 下降 |
| 1.0 | 0.25 | 0.25 | 权重一步到 2，偏置在 0／1 间交替，临界二周期 |
| 1.25 | 0.6875 | 4208.528049007069 | 第一步虽下降，偏置振幅持续增长，最终 loss 超过初值 |

四条轨迹的参数和 loss 均满足冻结的闭式对照容差；记录保留每步梯度、误差、参数差、范数、loss 及比较标志，不只保留最终 loss。α=1 的平台从第一次更新后开始，不能描述为初始 loss 就恒定。α=1.25 的第一步下降说明单步观察不足以证明优化稳定。

## 扩展压力检查的负结果

主实验之外，另检查允许配置边界 α=1.5、32 步的有限轨迹。当前本地运行在第 28、29、31、32 步未满足原 1e-12 权重闭式对照，原始报告的 all_oracle_matches=false 保留；偏置量级约 2×10⁹。输入合法、数值有限，并不保证任意扩展配置都满足该数值门。

首次将扩展范围一概要求通过的测试出现 47 项通过、1 项失败；修正为检查有限轨迹和比较标志如实反映差异，主实验的四组配置／12 步验收与原容差没有改变，生产算法没有为此修改。聚焦核心重跑为 48 项通过。初次格式检查的长字符串和紧凑语句在完整收集前修正；一次基线核验命令的引号错误也已在验证全部 313 个旧文件哈希之前改正，不改变仓库历史内容。差异的具体数值成因尚未建立，不能将消去或动态范围解释写成已经证明的原因，也不能要求所有平台都复现相同步骤的失败。

## 实现与验收状态

新增稳定性核心、CLI、冻结计划、协议、主实验及压力结果和测试，接入现有安装包与 CI；原有 15 个命令元组保持，追加第 16 个 CLI。工程共 18 个变更文件（6 个修改、12 个新增），完整树 325 个文件；三个既有入口检查测试随列表追加更新，旧数值门和限时保持。最终本地源码主套件 1,583 项通过（404.70 秒），三个独立目录分别 59、45、34 项通过，合计 **1,721 项，新增 85 项**。独立审查 26 项属于主套件子集，不另加总。干净离线非 editable wheel 的 16 个实际 CLI 全部通过；41 个包文件与最终源码及安装后字节一致，10 个依赖 wheel 哈希核对通过。Ruff lint／148 个文件格式检查（含文档代码块）、compileall 和 pip check 通过。源码 Python 3.12.14、torch 2.14.1+cpu，既有缺少 NumPy 的警告保留。没有在 wheel 环境重跑完整 pytest，本地没有执行 Docker。

工程已发布为 [16c2a0e9](https://github.com/zjDing1024/pytorch-from-zero/commit/16c2a0e92a5a0b65fcec2acd55fd31f06c9b3d92)，远端 main 与 325 个文件 blob 均已核对。[精确提交 CI 41459164018](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/41459164018)已成功完成，全部作业与步骤通过。source 主套件 1,583 项（246.00 秒）及三个独立目录 59／45／34 项通过，合计 1,721 项；148 个文件格式检查和 16 个 source CLI 通过。实际 Docker 的 16 个 installed CLI 也通过，容器未执行完整 pytest。

两份 artifact ZIP 的 SHA-256 与 GitHub 元数据一致，ZIP 完整性检查通过。source artifact 包含 18 份 JSON；source 和 container 均保留完整四组／48 步学习率报告，各自主实验全部验收通过，最终 loss 与本报告所列相同。这不构成普遍跨运行时逐位一致保证。扩展 α=1.5／32 步负结果仍限定为本地记录；主 CLI 没有重跑该压力配置，CI 测试只检查比较标志诚实性，未留存足以证明远端相同失配步骤的独立压力轨迹。

独立审查覆盖八个学习率、96 个步骤，闭式公式分别检查参数、梯度、参数差、前后 MSE、误差与范数；同时用真实优化器 no-op 替换证明原始轨迹未被解析答案覆盖，并验证非有限更新拒绝、重复运行及调用者 RNG 保持。扩展压力比较的逐行标志按原容差独立重算，保留平台差异。

## 代码与交付入口

以下入口固定到本次工程提交，不依赖后续 main 变化：

- [核心实现](https://github.com/zjDing1024/pytorch-from-zero/blob/16c2a0e92a5a0b65fcec2acd55fd31f06c9b3d92/src/pytorch_lab/lr_stability.py)。
- [命令行实验](https://github.com/zjDing1024/pytorch-from-zero/blob/16c2a0e92a5a0b65fcec2acd55fd31f06c9b3d92/src/pytorch_lab/lr_stability_cli.py)。
- [冻结计划](https://github.com/zjDing1024/pytorch-from-zero/blob/16c2a0e92a5a0b65fcec2acd55fd31f06c9b3d92/docs/lr-stability-plan.json)。
- [工程协议](https://github.com/zjDing1024/pytorch-from-zero/blob/16c2a0e92a5a0b65fcec2acd55fd31f06c9b3d92/docs/lr-stability.md)。
- [主实验完整48步结果](https://github.com/zjDing1024/pytorch-from-zero/blob/16c2a0e92a5a0b65fcec2acd55fd31f06c9b3d92/results/2026-11-02-lr-stability.json)。
- [扩展压力负结果](https://github.com/zjDing1024/pytorch-from-zero/blob/16c2a0e92a5a0b65fcec2acd55fd31f06c9b3d92/results/2026-11-02-lr-stability-stress.json)。
- [本地验证与失败记录](https://github.com/zjDing1024/pytorch-from-zero/blob/16c2a0e92a5a0b65fcec2acd55fd31f06c9b3d92/results/2026-11-02-lr-stability-verification.md)。
- [独立数学审查](https://github.com/zjDing1024/pytorch-from-zero/blob/16c2a0e92a5a0b65fcec2acd55fd31f06c9b3d92/results/2026-11-02-lr-stability-independent-review.md)。
- [干净安装包验证](https://github.com/zjDing1024/pytorch-from-zero/blob/16c2a0e92a5a0b65fcec2acd55fd31f06c9b3d92/results/2026-11-02-lr-installed-wheel-summary.json)。

成长仓库更新七份文档；前一份同日训练诊断报告仅增加导航，原实验结果保持。本文实际提交以 Git 历史为准，不预填自身未来 SHA。

## 技术理解与工程价值

- 梯度存在且参数有更新，不代表学习率稳定。
- 稳定方向也可能振荡；误差符号交替不等于 loss 发散。
- 最陡方向决定全部方向的稳定上界，特定初始值可能没有激活不稳定方向。
- 学习率的合法取值范围、解析稳定性、有限步数值对照是三个不同合同。
- 压力比较失败要保留，不能调宽阈值使其看起来与解析式一致。

这份材料连接了训练可观察性、Hessian、独立数学对照和工程验收，可用于解释优化器实际行为。学习路线按已完成的工程验证继续推进，不停留在重复遗漏操作或 checkpoint 示例。

## 不足与下一步

本项只有固定两参数凸损失，没有随机梯度、动量、权重衰减、Adam、GPU／AMP／DDP，也不衡量生产模型泛化或性能。不从四个学习率推出普遍最佳学习率。

下一项可转向特征缩放与条件数：保持预测问题等价，改变输入尺度并相应变换参数，比较曲率、稳定上界和收敛速度。应先固定变换、等价性与预算，再选择数值验证；避免继续只换更多学习率重复本轮。

后续同日推进见[特征缩放与条件数增量](FEATURE_CONDITIONING.md)，本报告的原始结果和边界保持不变。
