# 实验索引

## 2026-10-08：Tensor、Autograd 与仿射回归

- 项目：[pytorch-from-zero](https://github.com/zjDing1024/pytorch-from-zero)
- 主题：布局/共享、广播反向、梯度累加、解析/自动/数值求导与训练基线
- 原始记录：项目的 `results/2026-10-08-cpu.json`
- 验证：CPU float64；固定配置和数据划分；自动化测试与静态检查
- 边界：单种子合成数据，无 GPU/吞吐基准；由助理运行，个人自测待完成

每次新增实验先记录假设、比较对象、配置和成功/失败条件；结果保存原始数据，失败也保留并解释。未实际运行的内容不写成实验结论。


## 2026-10-08：Module / Dataset / DataLoader 小批次增量

- 实现：注册W/b的nn.Module、自定义map-style Dataset、局部Generator、torch SGD、train/eval/no_grad
- 验证：40轮、batch20、尾批16、三种子42/7/123；样本数加权和独立评估损失；全批次Module与手写同设置参数差均为0
- 原始记录：项目的 `results/2026-10-08-minibatch-cpu.json`、`results/2026-10-08-minibatch-seed7.json`、`results/2026-10-08-minibatch-seed123.json`
- [完整比较协议与复现命令](https://github.com/zjDing1024/pytorch-from-zero/blob/main/docs/minibatch-training.md)
- 质量：新增100项、合计152项本地测试通过；原始全批次源码、CLI和证据保留
- 边界：按相同数据遍历次数比较，更新次数不同；无吞吐结论；CPU合成数据；学习者自测仍待完成

## 2026-10-08：Epoch 边界 checkpoint 恢复（已发布并通过远程CI）

- 范围：固定96/32/32合成数据、CPU float64、3→1模型、torch SGD momentum0.8、num_workers=0；epoch0或完整epoch边界
- 保存内容：模型、完整优化器、配置、数据指纹、完成轮数/历史、训练和指标Generator、精确PyTorch版本、内容checksum
- 已执行比较：种子42/7/123分别在新进程连续40轮，对照7轮保存后新进程恢复到40轮；模型/优化器/RNG/历史/结果均一致，每种子15项断言通过
- 已执行反例：三个种子的丢失momentum与重置shuffle均造成下一轮轨迹差异；严格加载的坏格式/版本/张量/历史测试纳入聚合检查
- [恢复协议与运行入口](https://github.com/zjDing1024/pytorch-from-zero/blob/main/docs/checkpoint-recovery.md)：实现已发布，三种子实验及本地/远程319项测试通过
- 已执行：种子42的15项断言通过，连续/恢复参数差0；测试MSE0.0043601093；下一轮遗漏momentum/重置shuffle参数差0.0144504611/0.0036747311，见工程 `results/2026-10-08-checkpoint-cpu.json`
- 其他原始记录：工程 `results/2026-10-08-checkpoint-seed7.json`、`results/2026-10-08-checkpoint-seed123.json`
- 本地质量：319项测试（152原有+151checkpoint契约+16CLI）、Ruff/29文件格式、pip check、compileall及三条CLI通过
- 发布证据：工程增量 [9a5707696c064523ee95bcaddb49ab1f07dc4467](https://github.com/zjDing1024/pytorch-from-zero/commit/9a5707696c064523ee95bcaddb49ab1f07dc4467) 已发布；精确提交对应的 [CPU checks #37751219715](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/37751219715) 已成功完成，319项测试与三条CLI通过。前两阶段原始结果不覆盖
- 边界：只加载可信文件；受限加载与文件上限不是安全沙箱，checksum不认证来源；Linux本地原子可见性不保证断电持久性；无mid-batch、GPU、AMP、DDP、scheduler；学习者自测待完成
