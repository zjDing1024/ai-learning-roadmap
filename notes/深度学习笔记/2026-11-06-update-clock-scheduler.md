# 更新时钟、实际 LR 与边界恢复

## 研究对象与原创范围

研究 [PyTorch v2.14.1](https://github.com/pytorch/pytorch/tree/v2.14.1)，维护者为 PyTorch 社区与贡献者。实际阅读 [lr_scheduler.py](https://github.com/pytorch/pytorch/blob/v2.14.1/torch/optim/lr_scheduler.py) 中 LRScheduler 初始化、step、state_dict 和 StepLR，以及 [optimizer.py](https://github.com/pytorch/pytorch/blob/v2.14.1/torch/optim/optimizer.py) 的 load_state_dict 恢复顺序警告。源码遵循 [LICENSE](https://github.com/pytorch/pytorch/blob/v2.14.1/LICENSE) 的 BSD 风格及分组件声明。本文为原创解读，实验为原创实现，不复制上游代码。

数据沿用项目已有 Wine 数据与归属记录；[UCI Wine](https://archive.ics.uci.edu/dataset/109/wine) 官方数据许可为 CC BY 4.0，工程仓库保留数据说明。

## 从源码到时钟合同

StepLR.get_lr 在 last_epoch 非零且可整除 step_size 时对当前参数组 LR 乘 gamma。计数器名包含 epoch，不会自动知道何为数据轮次。调用者每次成功 optimizer update 后调用一次，它就在本实验中计数更新。

令 u 为从1开始的成功更新编号，初始LR0.05、间隔7、gamma0.5且无其他LR修改：本步使用 `0.05 * 0.5 ** ((u - 1) // 7)`，完成更新及 scheduler.step 后准备下一步使用 `0.05 * 0.5 ** (u // 7)`。

第7步更新依然使用0.05，完成后才准备0.025。第14步后准备0.0125，但未执行第15步，不能称0.0125已用于训练。日志同时保存 lr_used／lr_next，避免图表错位。

## 恢复不是加载一个计数器

LRScheduler.state_dict 明确排除 optimizer。恢复计数器不能恢复动量缓冲和参数组实际LR。官方 optimizer.load_state_dict 文档提醒先初始化 scheduler，再加载优化器状态，避免初始化覆盖已经加载的学习率。

本实验构造新的模型、SGD、StepLR，再加载模型／scheduler／optimizer，恢复轨迹游标并核对批次序列。快照使用深拷贝，防止后续训练修改历史状态。切点6／7／8覆盖衰减前、衰减刚完成、已使用新LR更新三种情形，逐个剩余边界递归比较完整状态，而非只比较终点loss。

训练中途失败可能已部分改变状态，因此本实验禁止失败执行器继续或保存，要求恢复此前完整快照；这不是通用事务回滚，也不是磁盘持久化协议。

## 为什么减少 LR 不一定降低短期 CE

动量SGD方向依赖新梯度、动量与权重衰减。降低LR直接缩小当前步幅，并不把既有动量缓冲减半；参数分岔后未来梯度也改变。12配置均是constant的第14步训练CE更低，应该保留结果而不是搜索到scheduler胜出。短前缀不能回答泛化或长期稳定性。

两batch均14更新，但batch16访问214行，batch32访问385行，不构成等数据／等算力对照。恢复后缀也是工作，总数588更新而非主轨迹的336次。完整数值与实际验收见[日报](../../daily-learning/2026-11-06/README.md)。

## 证据边界

可信内存快照只证明同进程、固定模型、相同输入与运行时的恢复。文件持久化、独立进程、输入身份与损坏处理需另外验证；不能由仓库已有通用恢复模块推断本实验已具备那些能力。本人是否能独立解释或实现也仍待自测。
