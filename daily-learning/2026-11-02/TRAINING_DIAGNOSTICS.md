# AI Engineer Daily Report：2026-11-02 训练诊断增量

后续同日完成的[学习率稳定性增量](LR_STABILITY.md)单独记录，本页原始诊断结果保持不变。

时区：Asia/Kuala_Lumpur。本页记录同日晚间继续推进的训练诊断；较早完成的[随机联合训练恢复](README.md)保留独立记录，不重复计作本项成果。

## 当前学习主题

从训练状态恢复转向训练过程诊断。在固定小批次中同时观察 loss、梯度存在性／范数及实际参数更新，区分“没有收到梯度”和“已有梯度但没有更新”。进度按学习与工程验收继续推进，练习作为巩固资料，不作为下一项工作的阻塞条件。

任务书、最新路线、实验索引和先前日报已读取。工程基线为 79cfee429f9f41e65af842536434ed16696c2c32，成长仓库基线为 cc78635a1032c819860f3d3319d60173ec6adad1。缓存缺失后重新核对远端内容，不把旧缓存或旧测试当作本轮结果。

## 研究项目与技术价值

研究 [PyTorch](https://github.com/pytorch/pytorch) 固定版本的 autograd.backward、Optimizer.zero_grad 和 SGD 实现，许可为 BSD 风格三条款。固定源码与许可证链接、实现结构及原创推导见[源码学习笔记](../../notes/深度学习笔记/2026-11-02-training-diagnostics.md)。没有复制上游代码，也未引入新的训练框架依赖。

价值在于把“训练不动”拆成可测量的问题：梯度为 None 与梯度为零不同，调用优化器与参数真正变化不同。诊断器只接收测量值，不读取实验故障名称，避免把预设答案当成推断结果。

## 预声明实验与实际结果

固定输入 x = [-1, -0.5, 0, 0.5, 1]，目标 y = 2x + 0.5，初始权重与偏置均为 0；使用 CPU float64、学习率 0.1、无 momentum／weight decay 的 SGD，各执行 12 步。计划在执行前冻结，三条路径共 36 个实测步骤。

| 路径 | 梯度观察 | 实际参数更新 | loss 结果 |
|---|---|---|---|
| 正确循环 | 每步存在非零梯度 | 每步发生更新 | 2.25 降至 0.16071347777446246 |
| 遗漏 backward | 两个参数的梯度均为 None | 无更新 | 保持 2.25 |
| 遗漏 optimizer.step | 存在非零梯度 | 无更新 | 保持 2.25 |

正确路径最终 weight = 1.435140927038，bias = 0.465640261632；两条遗漏路径参数保持 0。原始报告保留每步前后 loss、参数、梯度、参数差、范数与观测标签，不仅保留最终数值。这里报告的是固定合成数据上的训练行为，不是分类准确率、泛化收益或吞吐提升。

## 代码与验证

新增训练诊断核心、CLI、核心／独立审查／CLI 测试、预声明计划、协议和原始结果，并更新 README、安装检查与 CI。工程共 16 个变更文件（5 个修改、11 个新增），完整树为 313 个文件。原有 14 个 CLI 命令元组保持不变，追加第 15 个诊断入口。

最终本地源码主套件 1,498 项通过（404.09 秒），三个独立目录分别 59、45、34 项通过，合计 **1,636 项，新增 77 项**。独立审查 28 项和 CLI 11 项已包含在主套件，不重复相加。Ruff lint／140 个文件格式检查（含文档代码块）、compileall 和 pip check 通过。本地 Python 3.12.14、torch 2.14.1+cpu，缺少 NumPy 的既有警告不影响本项使用 Torch 的检查。

本轮没有数值测试或实验失败。恢复旧缓存时发现四份 Markdown 的引用转义错误，经远端 blob 核验修正后才运行测试；另有一个过长解释字符串在完整收集前换行修正。没有为获得通过改变数值容差、生产行为或限时。未修改的 297 个历史文件均与基线远端 blob 一致。

干净非 editable wheel 已在新环境离线安装，15 个真实 CLI 全部通过；39 个包文件与最终源码、安装后字节一致，10 个运行时依赖 wheel 哈希与锁文件一致。没有在 wheel 环境执行完整 pytest，本地没有执行 Docker。

工程已发布为 [f3b42b7f](https://github.com/zjDing1024/pytorch-from-zero/commit/f3b42b7fbd5ef10b88dc87865ac9e5e14756bbb4)，远端 main 与完整 313 个文件 blob 已核对。[精确提交 CI 41453848886](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/41453848886)已成功完成。source 作业主套件 1,498 项通过（391.51 秒），加上三个独立目录的 59、45、34 项，合计 1,636 项；140 个文件格式检查和 15 个 source CLI 通过。实际 Docker 作业的 15 个 installed CLI 通过，容器没有执行完整 pytest。

source artifact 包含 17 份 JSON，ZIP 的 SHA-256 与 GitHub 元数据一致，完整性检查通过；其中新诊断报告保留三条路径各 12 步。容器也保留完整诊断报告。两条执行路径分别核验正确训练 loss 从 2.25 降至 0.16071347777446246，两条遗漏路径 loss 保持 2.25 且观测标签不同。这里记录各环境内的检查结果，不据此宣称跨运行时状态交换、任意硬件数值一致或完整容器 pytest 通过。

## 独立方程与诊断边界检查

独立审查的 28 项检查已经通过；其中九组配置、108 个步骤使用标量闭式解核对权重、偏置、MSE、梯度及 SGD 更新，容差为预声明 atol=rtol=1e-12，没有宣称未测量的最大误差。它们属于最终主测试套件的子集，不额外叠加到总数。

审查把名称为“正确路径”的 step 替换为 no-op，输出随实际观测变成“有梯度但无更新”；又在没有 backward 时注入真实参数变化，输出“无梯度但有更新”。这验证判别器并未直接抄用干预名称。还检查八类观测、非法范数拒绝、逐步梯度清理、测量副本不随后续更新改变，以及同运行时重复执行和调用者 RNG 不变。独立审查没有失败测试或生产代码修正。

## 代码与交付入口

以下入口固定到本次工程提交：

- [核心实现](https://github.com/zjDing1024/pytorch-from-zero/blob/f3b42b7fbd5ef10b88dc87865ac9e5e14756bbb4/src/pytorch_lab/training_diagnostics.py)。
- [命令行实验](https://github.com/zjDing1024/pytorch-from-zero/blob/f3b42b7fbd5ef10b88dc87865ac9e5e14756bbb4/src/pytorch_lab/training_diagnostics_cli.py)。
- [预声明计划](https://github.com/zjDing1024/pytorch-from-zero/blob/f3b42b7fbd5ef10b88dc87865ac9e5e14756bbb4/docs/training-diagnostics-plan.json)。
- [协议与用法](https://github.com/zjDing1024/pytorch-from-zero/blob/f3b42b7fbd5ef10b88dc87865ac9e5e14756bbb4/docs/training-diagnostics.md)。
- [原始实验结果](https://github.com/zjDing1024/pytorch-from-zero/blob/f3b42b7fbd5ef10b88dc87865ac9e5e14756bbb4/results/2026-11-02-training-diagnostics.json)。
- [完整本地验收](https://github.com/zjDing1024/pytorch-from-zero/blob/f3b42b7fbd5ef10b88dc87865ac9e5e14756bbb4/results/2026-11-02-training-diagnostics-verification.md)。
- [独立方程审查](https://github.com/zjDing1024/pytorch-from-zero/blob/f3b42b7fbd5ef10b88dc87865ac9e5e14756bbb4/results/2026-11-02-training-diagnostics-independent-review.md)。
- [安装包验收](https://github.com/zjDing1024/pytorch-from-zero/blob/f3b42b7fbd5ef10b88dc87865ac9e5e14756bbb4/results/2026-11-02-diagnostics-installed-wheel-summary.json)。

成长仓库本轮更新八份文档，同日前一份恢复日报只增加导航，实验内容保持不变。本报告的实际提交以 Git 历史为准，不预填自身未来 SHA。

## 技术理解

- backward 会累积梯度，观察前必须清楚梯度来自哪个步骤；本实验每步先清为 None。
- 梯度存在性与范数共同报告，不能用一个 0 隐藏“没有梯度”和“存在零梯度”的差别。
- 参数更新必须从独立克隆的前后值计算，避免共享存储令“更新前”跟着改变。
- 非零梯度但参数不动不唯一意味着漏掉 step，例如学习率为 0 也可能表现相同。当前诊断输出是观测模式，不是任意训练任务的自动根因判定。
- 本项的 loss 单调下降只是预声明固定凸实验中的结果，不能外推为所有正确训练循环都必须逐步下降。

## 求职价值与当前进展

本项形成 ML／Deep Learning Engineer 的训练可观察性材料：固定对照、记录完整信号、独立方程检查、识别诊断边界，并把测试接入可安装运行路径。既有训练恢复主题已完成，当前进入训练诊断与优化，不再扩展同类 checkpoint 示例。

## 不足与下一步

当前是单进程、确定性 CPU 标量仿射实验，未覆盖随机层、混合精度、分布式、稀疏梯度、复杂参数组或生产训练日志。下一项转向有解析对照的学习率稳定性：依据本 fixture 的两个曲率方向，预先选定稳定、临界和不稳定学习率，比较 loss、参数误差与更新尺度，解释“确实在更新，但优化不稳定”。先冻结学习率集合、预算、数值范围和停止判据，保留发散或振荡结果，不为得到下降曲线事后调参。此项尚未执行；不在下一轮重复遗漏 backward／step 或新增同类 checkpoint 示例。
