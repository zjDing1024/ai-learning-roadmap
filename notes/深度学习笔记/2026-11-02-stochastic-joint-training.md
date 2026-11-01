# 输入 Dropout 与联合训练恢复

日期：2026-11-02，Asia/Kuala_Lumpur。阶段 1；本次承接[前日源码审查和验收合同](2026-11-01-stochastic-joint-contract.md)，不另建重复仓库。实际实现、测试和交付状态统一见[当日日报](../../daily-learning/2026-11-02/README.md)。本文的方程与设计分析不代替运行证据，也不证明学习者本人已经掌握。

## 为什么选择这个最小问题

此前已分别验证固定权重 Dropout 重放和确定性仿射联合恢复。单独存两份快照不能说明训练进度相同：随机前向、未更新梯度、SGD 动量、样本排列与游标可能来自不同微批次。本次将一个非原地输入 Dropout 接在既有 3→2 仿射回归之前，保留两组参数与可手写的梯度方程。它不是 4→8→2 MLP 迁移，不用于证明 Dropout 改善泛化。

## 官方项目与来源

### PyTorch

- 项目：[pytorch/pytorch](https://github.com/pytorch/pytorch)，由 PyTorch 项目维护，提供张量运算、Autograd、神经网络模块和优化器。
- 固定研究版本：[5c4886908584029761b579af026dcfb627c84070](https://github.com/pytorch/pytorch/commit/5c4886908584029761b579af026dcfb627c84070)。许可：[BSD 风格三条款](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/LICENSE)。
- 结构与阅读入口：[torch/random.py](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/torch/random.py)、[torch/nn/modules/dropout.py](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/torch/nn/modules/dropout.py)、[torch/optim/sgd.py](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/torch/optim/sgd.py)。本次实际读取三份源码和许可证。
- `fork_rng` 在进入前保存默认 CPU 状态，离开时通过 `finally` 恢复。它提供调用者状态隔离，不提供线程互斥或整个训练对象的事务回滚。
- Dropout 的模块前向将概率、训练模式和原地选项传给函数。这些行为信息不应只靠参数张量推断；精确恢复合同必须固定它们。
- SGD 的单张量路径先加入 weight decay，再形成 momentum buffer；第一次 buffer 来自当前梯度，后续才累积动量，最后更新参数。独立方程审查必须匹配此顺序，不能只比较无动量的近似公式。
- 适配当前阶段：用可解释的小模型验证框架状态语义，避免把任意 Module、并发或 GPU 行为混入同一个结论。

### Hugging Face Accelerate

- 项目：[huggingface/accelerate](https://github.com/huggingface/accelerate)，由 Hugging Face 维护，适配训练设备及执行方式，并统一检查点等训练状态管理。
- 固定研究文件：[checkpointing.py](https://github.com/huggingface/accelerate/blob/90b233c86202a5ded4bf66407e75222c5fb007fc/src/accelerate/checkpointing.py)。许可：[Apache 2.0](https://github.com/huggingface/accelerate/blob/90b233c86202a5ded4bf66407e75222c5fb007fc/LICENSE)。本次实际读取源码与许可证。
- 结构顺序：加载模型、优化器、调度器、数据状态和 scaler 后，再处理 RNG。其随机状态恢复错误被捕获并记录，体现框架自身的容错选择。
- 可借鉴的是状态覆盖和恢复次序；本项目要求精确恢复，缺失／非法随机状态必须拒绝，不能把日志后继续当作恢复成功。

以上为原创分析，没有复制上游代码，也不通过增加框架依赖来代替理解。固定引用用于复核，不声称这些快照是最新版本。

## 梯度和更新推导

令经过本次 Dropout 的输入为 Z，权重为 W、偏置为 b，误差 E = ZW + b − Y。求和平方误差的原始梯度为：

- 对 W：2 ZᵀE。
- 对 b：2 Σ行 E。
- 一个累积窗口将各微批次原始梯度相加，除以窗口内实际目标元素总数 D，而不是固定批数。尾批与尾窗口也使用实际 D。
- 对每个参数 θ，归一化后的数据梯度 g 加上 λθ 得到 d。首次 momentum buffer 为 d；之后为 μv + d（本范围 dampening=0、非 Nesterov）。参数按 θ ← θ − ηv 更新。

独立对照使用本次实际 Dropout 后的 Z，再手写上述梯度与更新方程；其独立性在数学方程，不在随机数算法。精确恢复对照则比较每个安全点的完整状态，两者是不同的验收门。不能用 1e-12 的方程容差覆盖恢复轨迹的精确不一致。

p=1 时输入归零不代表所有参数停止更新：偏置仍影响输出，已有动量和 weight decay 也可能作用。p=0／p=1 的 RNG 行为应按被测算子记录，不从一般 Dropout 直觉预填结果。随机掩码也意味着“微批次累积”与“一次拼接大批次”的随机计算未必相同，不能直接把它们当作公平数学对照。

## 共同安全点与两条随机流

数据排列使用专属 shuffle Generator；模型随机前向使用独立的 CPU RNG 状态。初始 seed 仅能重建起点，不能代替断点处已推进状态。一般模型恢复应先完成会消耗随机数的构造与加载准备，再安装保存的模型 RNG。本次沿用零初始化仿射模型，构造本身不需要随机初始化；因此本项不能单独当作任意随机初始化网络的恢复顺序证明。

完整安全点同时包含权重、SGD、待用原始梯度、实际分母、窗口计数、模型 RNG、shuffle 状态、索引和训练进度。微批次入口不能清空待用梯度；只有更新成功后才按合同清空。

前置参数校验失败可保留原安全对象。操作开始后先置为不安全；随机前向、反向、SGD 或下轮排列准备中途失败，都禁止旧对象继续或保存。调用者 RNG 可以恢复，但内部参数等状态可能已经改变，必须丢弃旧对象、加载先前完整快照。最终提交与返回之间任意异步中断不提供原子 ACK，内存安全点也不等于断电持久化。

## 学习者独立自测

以下均尚待本人完成，不能由助理产物代替：

1. 在一个三微批次窗口内，画出第二次 backward 后的状态。解释只保存权重和动量还缺什么，并手算恢复后误清梯度的影响。
2. 预测“恢复 RNG 后再构造模型”的错误后果；写出一个最小反例和正确恢复顺序。
3. 给出 p=1 时偏置或 momentum 仍能改变参数的数值例子，区分零输入和零更新。
4. 分别在前向后与更新后抛错，解释调用者 RNG 恢复为什么不允许旧训练器继续。独立写拒绝继续的测试。
5. 用实际掩码后的输入手算一轮梯度、weight decay 和 momentum，说明数学对照与精确恢复比较各能证明什么。

记录自己的预测、实现、失败和修复，才构成个人掌握证据。工程集成验收闭合后应转向训练诊断／优化，避免继续用相同状态序列化问题扩充作品数量。
