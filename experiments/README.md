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
