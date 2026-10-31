# CPU 随机训练联合恢复：源码审查与预声明验收

日期：2026-11-01，Asia/Kuala_Lumpur；对应 2026-10-31 16:00 UTC 定时批次。状态：**设计已审查，集成未实现，数值验收未运行**。

## 基线与本次工作

工程基线 [07a1a9fbe2f851a127909a1c24a856ce23c74628](https://github.com/zjDing1024/pytorch-from-zero/commit/07a1a9fbe2f851a127909a1c24a856ce23c74628)；成长仓库基线 7bd42269ebed5c87390e3b10d251e242a4b517c8。本轮重新读取任务书、路线、实验索引和最新日报，逐函数审查现有联合训练及 Dropout 重放。没有重做旧实验，也没有把旧 1,403 项测试计入本次。

云执行环境启动失败，命令工具返回“No usable execution environment”。没有可用且获授权的替代执行环境。本轮仅通过 GitHub 连接器阅读和发布原创技术记录；没有安装依赖、执行 Python、pytest、wheel 或 Docker。以下测试均为待执行要求。

## 已核实的七处接口差异

源码均固定到同一基线：
- [joint_recovery.py](https://github.com/zjDing1024/pytorch-from-zero/blob/07a1a9fbe2f851a127909a1c24a856ce23c74628/src/pytorch_lab/joint_recovery.py)
- [dropout_rng.py](https://github.com/zjDing1024/pytorch-from-zero/blob/07a1a9fbe2f851a127909a1c24a856ce23c74628/src/pytorch_lab/dropout_rng.py)

| 位置 | 现有行为 | 集成要求 |
|---|---|---|
| JointTrainer.__init__ / make_model | 前者固定 3→2 仿射回归；后者固定 4→8→2 | 保留三维仿射模型，在输入处增加非原地 Dropout；不直接接入四维 fixture |
| DropoutReplay.step | 每次 zero_grad 清空所有梯度 | 不能调用该方法作为微批次；保留未更新的原始梯度，仅更新成功后清空 |
| restore_snapshot | 固定 weight/bias 两项与优化器 ID 0、1 | 双 Linear 方案需要四组参数；本次选择输入 Dropout，保留原两组参数并验证顺序及状态 |
| JointTrainer.snapshot | 没有模型 RNG、模式或 Dropout p | 新格式保存独立模型 RNG、架构标识、p、模式、权重、待用梯度和原有联合状态 |
| 两者失败策略 | 无更新重放可在清梯度后重试；联合训练失败对象禁止继续 | 继承联合训练的失效规则，不把清梯度当作事务回滚 |
| 两者 save | replay JSON 明确不保证原子写；joint 用有界读取与 no-clobber 写入 | 保留联合文件协议；不把两个独立文件拼成完整快照 |
| step_microbatch 的 epoch 尾部 | before_commit 前已生成下轮排列 | 模型 RNG、shuffle RNG、游标和训练状态必须描述同一完成微批次后的安全点 |

以上是静态源码观察；不是现有仿射实现的缺陷报告。旧模型满足旧合同，新架构需要新的合同。

## 一次性集成范围

新增独立、版本化的随机联合训练合同，保留旧仿射快照和测试行为。固定单线程 CPU float64、输入 Dropout + 3→2 仿射模型、p=0.35、training=True、无可变 buffer，复用既有固定数据与平方误差求和。微批次梯度按实际目标元素总数归一化，再做 SGD；不更改已有数值阈值或 Wine 科学结果。

模型初始化 RNG、shuffle RNG、随机前向 RNG 分别有明确归属。只在受控单线程区间借用默认 CPU RNG；进入时保存调用者状态，安装训练对象的模型 RNG，完成前向／反向后捕获候选状态，离开时还原调用者状态。fork_rng 不提供并发互斥。本轮不引入随机增强、worker、AMP、GPU、DDP、任意 Module 或外部副作用保证。

### 成功与失败边界

1. 校验参数与安全标志。前置校验失败不启动操作，可保持原安全对象不变；开始操作前将对象标记为不安全。
2. 发出索引，执行随机前向、loss 和 backward，保留待用原始梯度及实际分母。
3. 到达累积窗口或 epoch 尾部时归一化并更新 SGD，成功后清空梯度。
4. 必要时推进下轮排列。将计数、模型 RNG 与索引进度共同提交，最后恢复安全标志。
5. 任何中途异常后，调用者 RNG 必须恢复；训练对象禁止继续、snapshot 或 save，重新加载上一份完整快照。即使部分参数已经改变，也不尝试局部补救。
6. 安全点是内存边界，不是持久化 ACK。最后赋值与函数返回间的任意异步中断不保证原子性。保留 no-clobber 文件发布，不声称断电持久性。

### 恢复次序

先验证格式、版本、配置、fixture、全部状态的类型／形状及一致性。构造候选模型与优化器必须隔离调用者 RNG；完成构造后加载权重、优化器、待用梯度、shuffle 状态和计数，最后安装捕获的模型 RNG。任何失败只丢弃候选对象。保存和加载本身也必须测试调用者 RNG 不被改变；校验和仅用于损坏检测，不证明训练历史或可信来源。

## 预声明验收矩阵（全部未运行）

固定 seed 7、42、123；每个 seed 使用同一个实现和配置比较连续运行与独立进程恢复，不跨运行时交换快照。不报告预计的通过数。

- A1：累积窗口内，已有非空待用梯度时保存。恢复后比较每个已提交批次的索引、输出、loss、原始梯度、权重、momentum、两条 RNG 状态及计数。
- A2：完整更新之后保存，验证空窗口梯度为 None、更新计数和后续轨迹一致。
- A3：epoch 尾批与下一轮排列准备后保存，检查实际分母、尾窗口只更新一次、索引无意外跳过或重复。
- A4：新进程完成至少一个后续 epoch；逐个安全点精确比较，不能只看最终 loss 接近。
- A5：在 fetch 后、随机前向后、backward 后、SGD 已修改参数后、进度提交前分别注入真实异常。旧对象必须拒绝所有继续／保存操作，从旧快照恢复的后缀应匹配连续基线。
- A6：成功、失败、构造、save、load 前后检查调用者默认 CPU RNG；在两步间插入外部随机采样，不应改变对象的训练轨迹。
- A7：故意只恢复 seed、漏掉模型 RNG、清掉待用梯度、重置 momentum；要求检出对应状态不一致，记录实际首次偏差，不预设数值大小。
- A8：错误架构、p、模式、参数顺序、非有限状态、RNG 非法字节、计数／游标不一致以及超限文件，必须拒绝；失败加载不污染调用者 RNG。
- A9：旧仿射恢复和旧无更新 Dropout 重放回归保持通过；旧 schema 不被静默解释为新模型。
- A10：最终代码执行受影响测试、完整源码套件、lint／格式、干净 wheel 的真实 CLI；发布后检查精确提交 CI。source、wheel、Docker 的覆盖分别报告，没运行的层次写未运行。

精确后缀比较仅适用于同一执行环境内的恢复实验。独立数学对照需另列预声明容差，不用其替代精确恢复门。Dropout 下不默认“微批次累积”等价于“拼接大批次”随机掩码；若验证累积数学，应固定同一掩码序列或使用单独确定性对照。

### 固定配置及独立对照

主配置预声明 23 样本、microbatch=5、accumulation=3，覆盖不等长尾批；seed 为 7、42、123。p=0 和 p=1 另作边界对照，不预设两者一定推进 RNG。p=1 时输入归零，但 bias 梯度、已有 momentum 和 weight decay 仍可能改变参数，不能要求零更新。训练主配置固定 training=True，模式变更必须拒绝。独立数学对照用实际 Dropout 后的输入推导仿射梯度和手写 SGD／动量更新，独立的是方程，不是随机数算法；使用 atol=rtol=1e-12，另行报告最大误差。该容差不得替代恢复后缀的精确比较门。

## 官方项目研究与许可

选择与当前状态边界直接相关的源码，而非引入新框架依赖。以下源码和许可证已实际读取，结论为原创分析，没有复制代码。

- PyTorch，由 PyTorch 项目维护，解决张量、自动求导与神经网络执行问题。[random.py](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/torch/random.py) 的 fork_rng 保存调用者 CPU 状态并在 finally 恢复；[dropout.py](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/torch/nn/modules/dropout.py) 将 p、training、inplace 传入函数。这解释了为什么权重之外还需保存行为配置。[许可证](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/LICENSE)为 BSD 风格三条款。
- Hugging Face Accelerate，解决训练执行与状态管理适配问题。[checkpointing.py](https://github.com/huggingface/accelerate/blob/90b233c86202a5ded4bf66407e75222c5fb007fc/src/accelerate/checkpointing.py) 在模型、优化器等状态恢复后处理 RNG；其中 RNG 恢复异常会被捕获并记录。严格精确恢复合同不能因此静默降级，必须拒绝无法恢复的状态。[许可证](https://github.com/huggingface/accelerate/blob/90b233c86202a5ded4bf66407e75222c5fb007fc/LICENSE)为 Apache 2.0。
- 当前阶段适配：借鉴状态归属和恢复顺序，保留本项目更窄的可验证范围。不宣称实现 Accelerate 全部兼容能力，也不复制上游实现。

## 收敛与求职价值

完成一次集成和上述边界验收后转向训练诊断／优化，不继续堆积 checkpoint 示例。本次展示的是源码审查、协议设计和证据纪律；尚未新增经过运行验证的训练能力。学习者本人仍需独立解释为何清梯度破坏窗口恢复、为何构造先于 RNG 恢复、以及为什么双 RNG 必须绑定同一安全点，并提供最小重写与失败修复证据。
