# 随机前向不是只设一个 seed：Dropout RNG 边界

日期：2026-10-31，Asia/Kuala_Lumpur。本文是原创源码研究与实验推导，不是学习者本人已独立掌握的声明。执行数据与交付状态见[当日日报](../../daily-learning/2026-10-31/README.md)。

## 1. 为什么选这个问题

10 月 30 日联合训练器使用确定性仿射模型；其中保存的随机状态属于打乱索引流，不能替代随机网络层使用的状态。今天只隔离一个缺口：同样的参数和输入，Dropout 的下一次前向能否接着原随机流运行，并得到相同反向结果？

网络固定为输入维度 4、隐藏维度 8、输出维度 2，中间使用 Dropout。参数不更新，损失采用求和平方误差。这个限制主动排除优化器、样本游标和累积窗口，让错误首先落在随机流、构造顺序或执行模式上，而不是把所有状态耦合后再猜原因。它是联合训练集成的前置证据，不是另一个完整训练框架。

## 2. 研究项目与来源

### PyTorch：随机算子如何与模块状态连接

- 项目：[pytorch/pytorch](https://github.com/pytorch/pytorch)，由 PyTorch 项目及贡献者维护。
- 解决的问题：张量计算、自动微分与神经网络模块；本轮聚焦随机层的调用链和 RNG 状态接口，不评价整个框架性能。
- 固定版本：v2.14.1 对应提交 [5c4886908584029761b579af026dcfb627c84070](https://github.com/pytorch/pytorch/commit/5c4886908584029761b579af026dcfb627c84070)。与本项目既有运行依赖对齐，避免将会变化的 stable 文档当固定版本证据。
- 结构：Python 模块层位于 torch/nn/modules，函数入口位于 torch/nn/functional.py，底层算子位于 aten/src/ATen/native，随机状态管理位于 torch/random.py。
- 许可：[固定版本 LICENSE](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/LICENSE) 为 BSD 风格的三条款许可，并列明各贡献者版权。本文仅链接与原创分析，不复制源码或重新授权上游代码。

阅读 [Dropout 模块](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/torch/nn/modules/dropout.py)、[函数入口](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/torch/nn/functional.py)和[底层算子](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/aten/src/ATen/native/Dropout.cpp)可见，模块把自己的概率、模式与原地选项传给函数。普通 CPU 输入的训练路径产生 Bernoulli 掩码，并对保留值做缩放；评估路径不进行同样的随机失活。该调用接口没有给普通 Dropout 模块传入专属 Generator 的参数，因此不能假定数据采样器的局部生成器也自动控制它。

[随机状态源码](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/torch/random.py)及[2.14 文档](https://docs.pytorch.org/docs/2.14/random.html)区分默认 CPU 生成器的状态与初始种子。fork_rng 在进入时保留状态并在退出时恢复；指定空设备列表仍保护 CPU 状态，避免把本次 CPU 实验扩展成加速器状态管理。它不提供多线程互斥。

### Accelerate：恢复次序和“成功”的含义

- 项目：[huggingface/accelerate](https://github.com/huggingface/accelerate)，由 Hugging Face 团队及贡献者维护。
- 解决的问题：组织训练运行与设备环境中的模型、优化器及相关状态；本轮只研究 checkpoint 状态覆盖，不引入该运行时依赖。
- 固定观察版本：[90b233c86202a5ded4bf66407e75222c5fb007fc](https://github.com/huggingface/accelerate/commit/90b233c86202a5ded4bf66407e75222c5fb007fc)。
- 结构：src/accelerate/checkpointing.py 组织保存／加载，data_loader.py 处理加载器与 sampler，utils 提供底层工具。不是将一份模型权重文件当所有训练状态。
- 许可：[Apache License 2.0](https://github.com/huggingface/accelerate/blob/90b233c86202a5ded4bf66407e75222c5fb007fc/LICENSE)。只作源码研究与接口层借鉴，没有复制其代码或安装新依赖。

在该版本的 [checkpointing.py](https://github.com/huggingface/accelerate/blob/90b233c86202a5ded4bf66407e75222c5fb007fc/src/accelerate/checkpointing.py) 中，模型、优化器、scheduler、dataloader 和 scaler 的恢复在随机状态恢复之前。名为 torch_manual_seed 的字段保存的是调用 get_rng_state 得到的状态，不应被字段名误导成一个初始种子整数。它还分别处理 Python、NumPy 和可用设备的随机状态，提醒我们明确每一条随机流的所有者。

同一函数对随机状态加载失败采用捕获异常并记录日志的策略。因此在本项目要求的精确重放验收中，“加载函数已经返回”不是充足证据，需要检查真正恢复的状态及后续轨迹。这是两种接口用途和验收目标的区别，不据静态阅读宣称上游项目存在已复现故障。对本次最小系统的借鉴是：先完成可能消耗随机数的构造与状态装载，最后确定下一次随机前向的起点，再实际比较后缀。

## 3. 状态推导

把一次随机前向写成“输入、参数、模式、概率、随机流当前位置”到“输出、下一随机状态”的映射。参数相同只固定其中一项。

1. seed 规定随机流的起点，不记录之前已经消耗了多少随机数。中途恢复要保存当前位置；重新设同一个 seed 通常回到开头，而非断点。
2. [Linear 的构造函数](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/torch/nn/modules/linear.py)会初始化权重和偏置。若先恢复 RNG 再构造网络，构造过程可能已经推进随机流，即使之后覆盖全部权重也不会自动撤销这种推进。恢复顺序是协议的一部分。
3. 普通模块 [state_dict](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/torch/nn/modules/module.py)围绕参数与持久缓冲组织状态。本次标准 Linear／Dropout 组合不会因此自动保存 Dropout 概率或训练标记，需要单独固定和验证。自定义 extra state 的模块不在这个概括范围内。
4. 模块模式与梯度记录是两个控制轴。[no_grad](https://docs.pytorch.org/docs/2.14/generated/torch.no_grad.html)关闭反向图记录，不负责调用 eval；训练模式的随机层仍可能消耗随机数。反过来，eval 并不禁止对确定性的评估前向求梯度。
5. 保存 RNG 不是保存 Autograd 图。此次边界在完整前向／反向调用之间，每次重新构造图并清理梯度，不恢复半途计算图或未完成 backward。

## 4. 隔离的含义与限制

实验对象保存私有 CPU RNG 字节状态，但实际 Dropout 调用仍临时使用进程默认 CPU RNG。调用时先保留调用者状态、安装对象状态，完成计算后捕获下一状态，再还原调用者状态。对象的私有状态与调用次数只在成功路径提交。本次固定网络没有可变 buffer 或参数更新；失败 backward 可能留下部分梯度，重试前全部清空，快照不保存这些临时梯度。这一重试设计限于工程合同中的固定网络，以及已测前向、反向与结果提取阶段的受控异常；最终私有 RNG／步数提交和返回之间遭遇任意异步中断，不保证原子性。指定阶段注入 KeyboardInterrupt 也不是进程强杀或断电实验。不从 fork_rng 单独推定任意对象的事务回滚。

这能验证串行调用与调用间外部随机扰动的隔离，不能证明并发线程互不影响。其他线程在临时替换默认状态的区间使用同一生成器仍可能产生竞争；fork_rng 不是锁。本项也没有保存 Python random、NumPy、CUDA、随机数据增强、worker 或分布式 rank 状态。

[PyTorch 可复现性说明](https://docs.pytorch.org/docs/2.14/notes/randomness.html)并不保证跨版本、平台或 CPU／GPU 的逐位一致。因此新进程重放成功只适用于声明的固定输入、实现和本次运行条件，不能升级成任意运行时之间可交换快照的结论。

## 5. 如何证明而不是只展示一个相等输出

主对照比较完整后缀，而非单个 loss：输出、损失、输入梯度、各参数梯度以及 RNG 状态必须符合声明的相等标准。每步参数不更新，所以结果不包含收敛速度或训练精度收益。错误对照应逐项改变条件，保留“重设 seed”“恢复 RNG 后额外构造一个 Linear，消耗随机数”“插入全局随机消耗”等证据；负对照出现差异是检查能抓到错误，不是正对照失败。初始化负对照用一个额外 Linear 构造作为最小干预，并非完整模型重建流程的端到端比较。

模式测试同时检查输出是否需梯度和随机状态是否推进，避免把“no_grad 的输出没有 grad_fn”误读成“Dropout 已关闭”。负对照使用确定的 fixture 与种子；不声称对任意输入、概率或随机种子必定不同，例如概率为零或特定退化输入不一定能观察到输出差异。

## 6. 接入判据与学习收敛

随机层集成到联合训练器至少还需要：明确独立于 shuffle 的随机流；把其状态与模型、SGD、待用梯度、分母及已提交索引写入同一安全点；定义失败后是否必须丢弃对象；比较真实更新后的参数和动量；保持调用者状态不被构造或恢复过程污染。本次无更新重放只能支撑这些设计，不替代集成测试。

后续限定一个 CPU 集成增量，验收上述条件后转向训练诊断或优化问题，不继续为提交数拆分序列化例子。学习者自测需要自行预测并复现：只存 seed 的失败、恢复顺序的失败、no_grad 与 eval 的区别，以及并发场景为何超出本协议。助理代码和测试不能替代这些个人证据。
