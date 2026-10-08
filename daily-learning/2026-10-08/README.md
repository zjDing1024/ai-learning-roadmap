# AI Engineer Daily Report

日期：2026-10-08，Asia/Kuala_Lumpur（UTC+08:00；本次执行对应 UTC 日期同为 2026-10-08）。

执行方式：AI 助理准备与验证工程材料；个人掌握程度尚待学习者独立自测。

## 今日学习主题

阶段 1：Tensor 的 shape/stride 与存储共享、广播反向、Autograd 累加、MSE 梯度推导、可复现训练与输入边界；同日完成 Module/DataLoader 小批次 SGD，并完成epoch边界checkpoint恢复的三种子实验与319项本地测试。

## 今日研究项目

- 项目：PyTorch
- GitHub：https://github.com/pytorch/pytorch
- 作者：PyTorch Team 与社区贡献者
- 解决问题：张量计算、自动微分与神经网络训练基础设施
- 核心技术：张量布局、动态图自动微分、Python/C++ 接口与底层算子
- 代码结构：torch Python API；torch/csrc 自动微分等 C++ 实现；aten 张量算子；tools/autograd 导数规则；docs 文档
- 技术价值：把 API 行为、数学预期和源码接口连起来，减少形状及梯度误用
- 阅读范围：v2.5.1 固定提交的 backward/grad、引擎入口和少量布局/广播片段；另补查运行环境 2.14.1+cpu 的 Python 累加标志
- 当前阶段适配：无需大模型或 GPU，即可验证训练核心概念
- 借鉴到项目：显式输入契约、累加与返回梯度的区别、布局实验和广播梯度测试

完整版本边界和官方链接见 [源码阅读](../../notes/深度学习笔记/2026-10-08-pytorch-source.md)。没有复制上游实现代码，也没有宣称读懂完整 C++ 引擎。

## 今日完成内容

### 代码

独立工程 [pytorch-from-zero](https://github.com/zjDing1024/pytorch-from-zero)：

- 原创张量布局/广播/梯度累加实验
- 仿射 MSE、解析梯度、中心差分与 Autograd 对照
- CPU float64 训练循环、独立 96/32/32 数据划分、均值预测和最小二乘基线
- CLI 输出原始 JSON，拒绝覆盖已有证据，异常返回非零退出码
- 首轮52项测试，覆盖多输出、非连续输入、坏维度、NaN/Inf、确定性和 CLI
- 新增 nn.Module 的 weight/bias 参数注册、自定义 Dataset、局部 Generator 的 DataLoader、小批次 SGD、train/eval 与 no_grad
- 尾批保留与样本数加权；在线损失和固定最终模型损失分开记录；训练与留出集隔离
- 本增量新增100项契约/CLI测试，覆盖参数梯度、打乱重放、模式观察、溢出、全批次一步等价与异常退出
- 依赖声明、src 布局、CI 配置、ruff 和文档

### 文件

成长仓库新增路线、技能地图、当前能力分析、源码笔记、实验索引、论文阅读规范与当日日报。工程仓库新增 src、tests、examples、docs、requirements、README、结果记录和 CI 配置。

### 实验

已在 Linux/Python 3.12.14/PyTorch 2.14.1+cpu 上运行；无 CUDA。配置、时间和完整数据保存在工程 `results/2026-10-08-cpu.json`。

| 项目 | 实测 |
|---|---:|
| 解析梯度 vs Autograd 最大绝对误差 | 5.55e-17 |
| 中心差分 vs Autograd 最大绝对误差 | 8.99e-10 |
| 训练 MSE，初始 → 200 步 | 7.805889 → 0.003311 |
| 验证 / 测试 MSE | 0.002961 / 0.004406 |
| 训练均值基线的测试 MSE | 3.891327 |
| 梯度下降与最小二乘参数最大差距 | 3.56e-14 |

首轮 pytest 52 项、ruff 检查/格式、pip check、完整 CLI 通过。独立复核还按 README 在无 system-site-packages 的新环境完成安装与同样检查，测试 MSE 一致。原始检查命令见工程验证日志。

### 同日第二增量：模块化小批次训练

保留首轮源码、CLI 和原始结果，新增 `minibatch.py`、`minibatch_cli.py`、两份测试与设计文档。沿用96/32/32固定划分、CPU float64，提前固定40轮、学习率0.05、batch size20、噪声标准差0.05。每轮20+20+20+20+16，无尾批遗漏。

| 种子 | 训练 MSE | 验证 MSE | 测试 MSE | 训练均值基线测试 MSE |
|---|---:|---:|---:|---:|
| 42 | 0.0033112462 | 0.0029567797 | 0.0044245039 | 3.8913270718 |
| 7 | 0.0028159888 | 0.0022142473 | 0.0032732652 | 6.9399290932 |
| 123 | 0.0031495186 | 0.0022639518 | 0.0019115776 | 7.3263768430 |

同设置 Module 全批次与原手写全批次的参数最大差距，本地3个种子均为0；GitHub Actions 默认种子42为5.55e-17，仍通过既定容差检查，不要求跨环境逐位相等。小批次和全批次都访问3840个训练样本，但分别更新200次和40次；不把这个结果说成等更新预算或吞吐优势，也不混用首轮200步/学习率0.1的结果。

工程设计、复现实验命令与3份原始 JSON 见 [模块化小批次训练](https://github.com/zjDing1024/pytorch-from-zero/blob/main/docs/minibatch-training.md)。默认种子42由初始训练 MSE 7.805889降至0.003311246。三种子是小型合成数据检查，不代表统计显著性或真实数据泛化。

本增量完整本地检查为152项测试、Ruff检查/格式、pip check、compileall、原始和新增两条CLI；原手写实验与新增训练结果均重新执行并复核重放。新增量已发布为 [dd0485d52c3adc917cff8b5bb267ac4952dc3c23](https://github.com/zjDing1024/pytorch-from-zero/commit/dd0485d52c3adc917cff8b5bb267ac4952dc3c23)，对应 [CPU checks #37748369295](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/37748369295) 已成功完成；本增量有独立远程CI证据。

### 同日第三增量：epoch 边界 checkpoint 恢复（本地验证完成）

核心实现已加入固定CPU float64、3→1仿射模型的恢复实验。默认96/32/32划分、batch20、学习率0.05、momentum0.8；仅支持单进程DataLoader（num_workers=0） 和 epoch 0/完整 epoch 边界。保存模型、完整优化器 momentum buffer、配置、数据指纹、完整历史及训练/指标 Generator 状态；新进程加载后继续到累计目标轮数。

验收协议：连续40轮与“7轮后保存、新进程恢复到40轮”逐项比较；另以丢失 momentum、重置 shuffle 为负对照。严格检查 schema、精确 PyTorch 版本、配置、张量/历史/RNG 与内容 checksum；返回新的 trainer，不部分覆盖原对象。保存使用同目录临时文件和 hard-link no-clobber；Linux 本地文件系统原子可见性不等于断电持久性。

安全和支持边界：仅加载自有/可信文件，显式 `weights_only=True`/CPU，无不安全回退；8 MiB与10,000轮上限不是不可信输入安全沙箱，checksum不是身份认证。不支持 mid-batch、AMP、GPU、DDP、scheduler 或任意架构。失败 epoch 不可保存，从上一有效 checkpoint 恢复。

已执行种子42的新进程实验：连续/恢复参数最大差距0，模型、优化器、局部RNG、完整历史、报告和内容checksum相同，15项断言通过。训练/验证/测试MSE为0.0033463182/0.0028868156/0.0043601093。epoch7 checkpoint为14,037字节；从第7轮到第8轮的负对照，遗漏momentum、重置shuffle的参数最大差分别为0.0144504611、0.0036747311。原始证据为工程仓库 `results/2026-10-08-checkpoint-cpu.json`。

种子7/123使用相同40轮/分段7轮配置也各通过15项断言，恢复参数差均为0；训练/验证/测试MSE分别为0.0028570668/0.0022004279/0.0033959516和0.0031506270/0.0022858665/0.0019066210。遗漏momentum/重置shuffle的下一轮参数差，种子7为0.0191405113/0.0048320308，种子123为0.0481323629/0.0065692380。两份原始证据为 `results/2026-10-08-checkpoint-seed7.json` 与 `results/2026-10-08-checkpoint-seed123.json`。这仍是小型合成数据的恢复检验，不构成momentum普遍更优或统计显著性的结论。

本地完整pytest319项通过，耗时77.76秒：原152项保持，加checkpoint契约151项、CLI16项。Ruff检查/29文件格式检查、pip check、compileall和原始/小批次/checkpoint三条CLI通过。独立审查执行了fsync失败注入与真实三进程同路径写入竞争；最终代码的独立复跑319项测试通过（78.55秒），lint/29文件格式、pip check、compileall和种子42精确重放也通过。checkpoint与可选JSON各自原子保存，不构成两文件事务；报告失败可能留下已成功保存的checkpoint。最终文档/清单验收与发布、提交与远程CI待核对，不借用前两阶段成功作为本阶段证据。详细设计见[checkpoint 文档](https://github.com/zjDing1024/pytorch-from-zero/blob/main/docs/checkpoint-recovery.md)；该链接对应的新文件发布状态仍待核对。

## 技术理解

### 今天真正掌握

**学习者：待自测，尚无独立掌握证据。** 本次已经由运行结果核验的技术事实：

- 多输出 MSE 对 N×K 个元素求均值，解析梯度必须保留 K 的缩放。
- 偏置共享到多行时，反向把这些行的贡献相加。
- 两次独立前向后反向会累加叶子 `.grad`；累加不等同于保留同一次计算图。
- 本例转置共享存储，直接展平 view 失败，reshape 产生副本；不能无条件推广到所有布局。
- 参数值有限仍可能在平方损失中溢出，需要检查计算结果。
- nn.Parameter 使模型参数可被 Module/优化器发现；单层零初始化不能推广到深层网络。
- `eval()` 与 `no_grad()` 职责不同；不等长 batch 的 MSE 不能直接平均。
- DataLoader 的评估迭代也会消耗 base seed，需要局部 Generator；指标 loader 不应推进训练 shuffle 状态。
- 当前受限CPU实验中，恢复模型、momentum、配置/历史及两个Generator后，新进程轨迹与连续运行一致；只保留seed或模型权重会遗漏关键状态。
- checksum核对内容一致性，不证明文件来源；weights-only加载仍须遵守可信来源和资源风险边界。

### 遇到的问题与修复

初始运行环境缺少 PyTorch，已从官方 CPU 源安装并验证。独立审查发现超大学习率可能让有限输入的损失溢出；已显式拒绝非有限损失并增加三个回归测试。临时依赖快照不是完整锁文件，最终采用固定顶层版本并明确边界，未提交本地绝对安装路径。

同日恢复增量的独立审查发现：仅冻结配置dataclass仍允许替换trainer的公开config引用，可能使旧loader状态与新配置元数据不一致。已改为只读属性并增加回归测试；修改后完整聚合319项测试通过；最终文档/清单验收及发布另行核对。

## GitHub 变化

- 新增公开仓库：ai-learning-roadmap、pytorch-from-zero
- 新增文件：上述成长记录与可运行工程文件
- 首次成长记录 Commit：[672116e4238a6d5460631b76bd1f8f5b561e9710](https://github.com/zjDing1024/ai-learning-roadmap/commit/672116e4238a6d5460631b76bd1f8f5b561e9710)，已核对 main 与全部 9 个文件的内容哈希。本报告的发布证据补记属于后续独立文档提交。
- 首次工程 Commit：[00d55e32293ab91456cc0e36f25b02be5455bb6f](https://github.com/zjDing1024/pytorch-from-zero/commit/00d55e32293ab91456cc0e36f25b02be5455bb6f)，已核对 main 与全部 22 个文件的内容哈希。
- 远程 CI：以上工程提交的 [CPU checks #37745868861](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/37745868861) 已成功完成。依赖和项目安装、Ruff 检查/格式、52 项测试及 CLI 的 10 项实验断言全部通过；测试保留 1 条未安装可选 NumPy 的警告。成长仓库未配置工作流，不将“无运行”表述为 CI 通过。
- 同日模块化工程 Commit：[dd0485d52c3adc917cff8b5bb267ac4952dc3c23](https://github.com/zjDing1024/pytorch-from-zero/commit/dd0485d52c3adc917cff8b5bb267ac4952dc3c23)，原子提交14个变更文件；已核对 main 与全部31个工程文件的Git blob哈希，保留其余文件。
- 同日成长记录 Commit：[89d08cfe4ce02ddf68a36deb4f7274d1d1798819](https://github.com/zjDing1024/ai-learning-roadmap/commit/89d08cfe4ce02ddf68a36deb4f7274d1d1798819)，原子提交6个变更文件；已核对 main 与全部9个成长记录文件的Git blob哈希。本段远程证据属于随后独立文档补记。
- 新增量远程 CI：[CPU checks #37748369295](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/37748369295)，head SHA与上述模块化工程提交完全一致，结论success。Ubuntu 24.04.5、Python 3.12.15、PyTorch 2.14.1+cpu上依赖/项目安装、Ruff检查、22个Python文件格式检查、152项测试（27.49秒）和两条CLI全部成功。原CLI的10项、新CLI的5项实验断言全部为true；pytest保留1条可选NumPy未安装警告。Actions还报告Node 20弃用并以Node 24执行旧版官方actions及punycode弃用提示，未影响本次结果。

## 求职价值分析

- 对应岗位：AI/ML/Deep Learning Engineer 的基础工程部分
- 体现材料：数学与实现对照、可失败测试、数据隔离、原始证据与诚实局限说明
- 当前限制：仅小型合成线性问题；checkpoint仅覆盖固定CPU模型及完整epoch边界；无生产数据、GPU、部署或真实性能评估，不能单凭这些增量证明岗位胜任力

## 当前能力变化

- 新增工程证据：有一个能独立运行和复核的 PyTorch 基础实验项目
- 个人新增技能：等待自测后确认
- 新增工程证据：模块化小批次训练、torch SGD、模式切换、尾批统计、可复现打乱与三种子对照已运行
- 新增工程证据：固定CPU实验的epoch边界恢复、三种子新进程等价、状态遗漏反例和319项本地测试；使用torch SGD momentum，尚不等于手写momentum对照或scheduler能力
- 不足：起点能力与学习时间未知；个人独立理解未验证；本恢复增量最终文档/清单验收与发布及远程CI待核对；手写momentum/Scheduler、真实数据、CUDA等尚未完成

## 下一阶段计划

- 学习：完成梯度、广播、布局、Module/DataLoader和checkpoint独立自测；解释尾批加权、优化器缓冲、RNG与失败恢复边界
- 当前阶段收尾：checkpoint本地验证与独立测试复跑完成，核对最终文档/清单验收与发布和该增量远程CI；保留前两阶段及新增原始证据
- 下一工程增量：从方程手写momentum SGD，逐步核对torch参数/缓冲，再加入scheduler调用顺序和状态恢复实验
- 原因：先理解并验证训练状态，再扩展更新规则和学习率策略；不为增加仓库数量跳级
- 完成门槛：手写/torch逐步等价、scheduler恢复状态明确、训练预算可比；个人能力仍以独立自测为准
