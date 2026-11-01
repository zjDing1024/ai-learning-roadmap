# AI Engineer Daily Report：2026-11-02

时区：Asia/Kuala_Lumpur。主题：输入 Dropout 与累积 SGD 的联合安全点恢复。

## 本轮范围与工程进展

任务书、最新路线、实验索引和 11 月 1 日验收合同已重新读取，两个仓库基线已核验。上一日运行环境故障已解除，本轮完成实际实现与源码测试，不重复上一日设计工作。工程继续归入 [pytorch-from-zero](https://github.com/zjDing1024/pytorch-from-zero)，学习过程保存在本仓库，不新建同类项目。

模型是在既有零初始化 3→2 仿射回归输入处增加非原地 Dropout，使用单线程 CPU float64。与此前无更新重放不同，本轮有真实梯度累积和 momentum SGD 更新，并将模型 RNG、shuffle RNG、待用梯度、实际分母、优化器和索引进度共同保存。它不是 4→8→2 MLP 集成，也不证明 Dropout 提升泛化或训练速度。

## 研究项目与技术价值

实际读取 [PyTorch](https://github.com/pytorch/pytorch) 固定版本的 random.py、dropout.py、sgd.py 和 BSD 风格三条款许可证，以及 [Hugging Face Accelerate](https://github.com/huggingface/accelerate) 固定 checkpointing.py 与 Apache 2.0 许可证。原始链接、维护者、源码结构、设计取舍和原创方程推导见[学习笔记](../../notes/深度学习笔记/2026-11-02-stochastic-joint-training.md)。未复制上游代码或引入新框架依赖。

研究重点：fork_rng 还原调用者随机状态不等于训练事务；严格恢复必须拒绝无法恢复的状态；SGD 先加入 weight decay，再形成 momentum，首次 buffer 与后续递推不同。

## 实际完成的代码与实验

- 新增 stochastic_joint.py：StochasticConfig、StochasticJointTrainer、严格快照恢复及 no-clobber 保存／有界加载接口。新格式保留旧仿射和无更新重放合同。工程最终变更 16 个文件（5 个修改、11 个新增），完整树为 302 个文件。
- 新增 stochastic_joint_cli.py、协议中的运行示例、核心／CLI／独立方程测试和原始结果，接入已安装包检查与 CI。
- 使用 23 样本、microbatch=5、accumulation=3、p=0.35、seed 7／42／123，各训练 3 个 epoch。六个 worker 中三个建立连续基线，三个执行恢复与故障实验。
- 9 个正常恢复案例：108 个恢复后步骤、117 个安全点；15 个显式故障恢复案例：177 个恢复后步骤、192 个安全点。每一步的已提交索引、输出、loss、原始累计梯度与完整安全点状态均精确一致。原始 JSON 保留 45 步连续基线完整记录。不同计数不相加成测试数。
- 五处显式故障为 fetch 后、随机前向后、backward 后、SGD 更新后、最终进度提交前。失败对象拒绝继续／保存，从旧完整快照恢复匹配基线；这不是强杀进程或断电恢复实验。
- 独立数学审查：18 组配置、144 个微批次步骤，涵盖 p=0／0.35／1 和两组批次尺寸。用实际丢弃后的输入手写仿射梯度、归一化、weight decay、momentum 和更新，满足预声明 atol=rtol=1e-12；没有测量或宣称最大误差。独立性在方程，不在 Dropout 算法或张量内核。

## 实际验证记录

最终本地源码主套件 **1,421 项通过，340.70 秒**；三个独立目录分别通过 59、45、34 项，合计 **1,559 项，新增 156 项**。独立审查的 32 项已经包含在主套件中，不另加总。完整新 CLI 在本地源码执行通过；其他本地源码 CLI 未据此一并宣称通过。

初次核心方程测试因测试重建张量误用 float32 出现 9 项失败，改为正确的 float64 后通过，未调宽容差。独立审查首次为 31 项通过、1 项测试构造失败：NaN 无法通过既有严格 JSON 校验和生成，改用有限越界概率 1.1 才到达目标语义校验；未更改生产代码或阈值。

首次完整主套件为 1,419 项通过、2 项失败：既有安装检查测试仍假定 13 个 CLI。更新为包含新入口的精确 14 项列表后，聚焦检查又发现原负索引会因新增入口错位，改为对应稳定位置；一次中间全量运行被中断，不能算作完整通过。最终完整重跑结果如上。另一次从父目录启动 lint 的命令没有匹配仓库相对排除路径；在仓库根目录重跑原 CI 命令通过，冻结历史源码未修改。旧科学结果、数值标准和超时限制没有改变。

独立审查还执行四类真实操作后抛错（前向、反向、优化器更新、epoch 推进），并拒绝八类重算校验和的非法快照。成功／失败、构造、保存、加载及拒绝恢复路径检查调用者 CPU RNG 保持；前置校验失败不破坏仍安全的对象。

干净非 editable wheel 已在新虚拟环境离线安装，14 个真实 CLI 从无关目录以 python -I 执行全部通过；37 个包文件与最终源码和安装后字节一致，10 个锁定依赖 wheel 哈希核验通过。没有在 wheel 内重跑完整 pytest，本地未运行 Docker。Ruff lint、132 个文件格式检查（含 Markdown 代码块）、compileall 和 pip check 通过。工程已发布为 [79cfee42](https://github.com/zjDing1024/pytorch-from-zero/commit/79cfee429f9f41e65af842536434ed16696c2c32)，远端 main 与完整 302 个文件 blob 已核对。精确提交的 [CI 运行 41326077635](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/41326077635)已成功完成。source 作业主套件 1,421 项（359.03 秒）及三个独立目录 59、45、34 项均通过，合计 1,559 项；132 个文件格式检查和 14 个 source CLI 通过。实际 Docker 作业的 14 个 installed CLI 也通过，容器未运行完整 pytest。

两份 artifact ZIP 的 SHA-256 与 GitHub 元数据一致，ZIP 完整性检查通过。source artifact 包含 16 份 JSON，保留原 baseline 的 local-ci.json 与新 stochastic_joint 完整报告；容器 artifact 也保留新实验的完整报告，而非仅成功摘要。两条执行路径各自验证 9 个正常案例（108 步、117 安全点）和 15 个故障案例（177 步、192 安全点）。source 使用 Python 3.12.15，container 使用 3.12.14；只验证各自环境内的恢复，没有跨运行时快照交换或数值相等结论。

## 代码、数据和交付入口

以下均绑定本次工程提交，不依赖后续 main 变化：

- [核心实现](https://github.com/zjDing1024/pytorch-from-zero/blob/79cfee429f9f41e65af842536434ed16696c2c32/src/pytorch_lab/stochastic_joint.py)与[新进程 CLI](https://github.com/zjDing1024/pytorch-from-zero/blob/79cfee429f9f41e65af842536434ed16696c2c32/src/pytorch_lab/stochastic_joint_cli.py)。
- [工程协议](https://github.com/zjDing1024/pytorch-from-zero/blob/79cfee429f9f41e65af842536434ed16696c2c32/docs/stochastic-joint-training.md)。
- [完整实验 JSON](https://github.com/zjDing1024/pytorch-from-zero/blob/79cfee429f9f41e65af842536434ed16696c2c32/results/2026-11-02-stochastic-joint.json)。
- [源码验收及失败记录](https://github.com/zjDing1024/pytorch-from-zero/blob/79cfee429f9f41e65af842536434ed16696c2c32/results/2026-11-02-stochastic-joint-verification.md)。
- [独立方程审查](https://github.com/zjDing1024/pytorch-from-zero/blob/79cfee429f9f41e65af842536434ed16696c2c32/results/2026-11-02-stochastic-joint-independent-review.md)。
- [干净 wheel 验收](https://github.com/zjDing1024/pytorch-from-zero/blob/79cfee429f9f41e65af842536434ed16696c2c32/results/2026-11-02-installed-wheel-summary.json)。

成长仓库本轮更新 README、路线、实验索引、能力分析、源码笔记及本日报，共六份文档。本日报自身实际提交以 Git 历史为准，不预填未来 SHA。

## 技术理解与个人自测

窗口中保存的是尚未用于更新的原始梯度，微批次入口清梯度会破坏恢复。两条 RNG 与优化器、数据游标必须指向同一个安全点。失败后即使调用者 RNG 还原，内部参数可能已经更新，旧对象仍必须作废。

p=1 在本次零初始化 fixture 中权重保持零而偏置变为非零；不能外推为所有参数不更新。随机恢复与独立数学对照分别使用精确门和 1e-12 容差门，不相互替代。模型构造本身是零初始化，本项也不单独证明任意随机初始化网络的加载顺序。

可展示 ML／Deep Learning／Research Engineer 所需的状态设计、故障注入、独立数学对照和可复现实验能力。这里验证的是助理实现的工程产物；学习者本人仍需独立完成[五项自测](../../notes/深度学习笔记/2026-11-02-stochastic-joint-training.md#学习者独立自测)，提供预测、重写和修复记录，不标记已掌握。

## 不足与明日计划

仅限同执行环境、可信自有快照、单进程单线程 CPU float64。无任意 Module／可变 buffer、并发随机消费者、worker／预取、随机增强、GPU／AMP／DDP、跨运行时快照交换、断电持久性或外部副作用恰好一次保证。校验和用于损坏和误配检测，不证明训练历史。

本次有界集成验收闭合后，明日转向训练诊断：在固定小批次上记录 loss、参数梯度范数与实际参数更新范数，比较正确循环、遗漏 backward、遗漏 optimizer.step 三条受控路径。先冻结输入、初始参数、更新预算和判据，再检查能否区分“没有梯度”和“有梯度但没有更新”，而不是只看最终 loss。此计划尚未执行；不继续拆分同类 checkpoint 示例，也不凭小型合成数据声称模型能力或吞吐提升。
