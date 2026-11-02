# AI Engineer Daily Report

日期：2026-11-03，Asia/Kuala_Lumpur（本轮触发：2026-11-02 16:00 UTC）。阶段 1：PyTorch 基础工程。

## 今日学习主题

把训练观测接回既有 Wine 分类任务，解释小批次 CE 梯度、momentum、weight decay 与实际参数变化，并验证观测不干扰训练。已重读任务书、最新路线和实验索引；11 月 2 日的联合恢复、训练诊断、学习率和条件数成果保留，不重复实施。新代码继续进入已有独立项目 `pytorch-from-zero`，不为一次增量新建空仓库。

## 今日研究项目

项目：[PyTorch](https://github.com/pytorch/pytorch)，由 PyTorch 团队与社区维护。读取固定提交 `5c4886908584029761b579af026dcfb627c84070` 的 SGD、autograd 和许可证。技术价值是厘清真实训练更新语义及观测时点，不引入额外框架或依赖。[原创源码笔记](../../notes/深度学习笔记/2026-11-03-wine-training-observations.md)包含固定官方链接、许可与推导。

数据沿用已入库 [UCI Wine](https://archive.ics.uci.edu/dataset/109/wine)（Aeberhard 与 Forina，1992；CC BY 4.0）及既有来源／许可文件，不重新下载或改写数据。只公开本任务原创技术增量。

## 今日完成内容

### 锁定的实验协议

- 仍为 107 条训练、36 条验证、35 条测试；标准化只使用训练集拟合。
- 线性 13→3 与 MLP 13→16→3，种子 42/7/123；CPU float64，batch16、保留 11 条尾批。
- 原 SGD 配置不变：学习率 0.05、momentum 0.9、weight decay 1e-4。
- 每个模型／种子固定 **2 轮、14 更新、214 样本访问**，六次合计 **84 更新、1,284 样本访问**。观测字段与验收在读取留出集分数前固定。
- 新增观测探针只使用训练集，不运行验证选择或测试评分，也不根据观测修改学习率、架构或预算。历史正式结果为每次 120 轮、840 更新、12,840 样本访问，本次前缀不替代它。

### 代码、文件与实际结果

已生成并发布[原始观测 JSON](https://github.com/zjDing1024/pytorch-from-zero/blob/1c4aaaf7eee34d32b7dab1f5f34bf3232efa8fb0/results/2026-11-03-wine-observations.json)，Python 3.12.14、PyTorch 2.14.1+cpu、CPU float64 单线程。六次运行全部七项检查通过：观测开关的 audit 轨迹相同、关闭诊断的最终参数相同、与原 `fit_candidate` 最终参数相同、原 history 与预算相同、精确前缀预算、更新符合 momentum、梯度存在。

| 架构 | seed 42 最终训练 CE | seed 7 | seed 123 |
|---|---:|---:|---:|
| linear | 0.091532547 | 0.110625801 | 0.094449431 |
| mlp16 | 0.274933430 | 0.273297940 | 0.200184599 |

这是第二轮末训练集 CE，**不是验证／测试分数，也不据此选择架构**。84 个观测更新包含 252 条逐参数记录；更新方程最大绝对残差 `6.245004513516506e-17`，以预声明 `atol=rtol=1e-12` 检查。9 条初始 bias 零范数读数的 update/parameter ratio 明确为 `null`，不是零或无穷大。

资源预算分开记录：观测主路径是 84 更新／1,284 样本访问；再运行关闭诊断及原训练器两个对照路径，**本次 JSON 实际总训练为 252 更新／3,852 样本访问**。关闭诊断路径仍记录 audit 哈希，因此它验证诊断统计的非干扰；原训练器提供未插入观测的最终参数与 history 参考。不能称“完全无观测路径逐步轨迹已比较”。

独立审查另运行 7 项测试：直接包裹真实 `SGD.step`，以克隆的更新前参数与原始梯度独立重建 decay、momentum 和更新，容差 `1e-14`；核对逐参数指标与尾批加权。隔离测试把留出特征改为 NaN、标签改为 -100，禁止评估和重新生成划分，并守卫每次 forward 只接收标准化训练行；预处理和训练输入保持相同。实际计数再次得到 252 更新、3,852 训练访问及 36 次完整训练集 epoch 评估，后者不是 optimizer 样本访问。全局 CPU RNG 未改变。

审查过程中修正的是测试对 bias 命名、浮点求和顺序和精确测量快照的假设，没有据此调整实验参数、生产实现或容差。

本地四套 source 测试实际通过 **1,868 = 1,730 + 59 + 45 + 34**。本次新增 62 项（35 核心、20 CLI、7 独立审查）；上文 7 项已包含在 1,730 中，不重复计数。main 运行 390.71 秒，附一条缺少可选 NumPy 的 Torch 警告；测试不依赖 NumPy。Ruff lint、最终 164 文件格式检查、compileall 和 pip check 通过。

新增原创 `src/pytorch_lab/wine_observations.py`、`wine_observations_cli.py`，核心／CLI／独立测试、冻结协议 `docs/wine-observations-plan.json`、工程说明 `docs/wine-observations.md`、原始 JSON 和验收记录；更新工程 README 与 CI 入口。既有 `wine.py`、数据／划分、历史原始结果和数值阈值不改。

干净非 editable wheel 的 45 个包文件与 source／安装目录逐字节一致，使用 10 个离线哈希锁定依赖；在无关工作目录用 `python -I scripts/check_installed.py` 实际执行 **18 个已安装 CLI，全部通过**。这不是安装环境全量 pytest，也不是本地 Docker 实测。既有交付套件另行重跑历史完整 Wine benchmark（包含留出评分），没有使用它的输出调整本次训练观测配置。

开发阶段修正测试的 Python 浮点求和顺序、fixture dtype、bias 命名及快照假设；一次 CLI 解析到旧 editable checkout，通过当前源码路径及重新安装修复。最终运行证据保留，没有修改科学预算、阈值或历史结果来掩盖失败。[本地完整验收](https://github.com/zjDing1024/pytorch-from-zero/blob/1c4aaaf7eee34d32b7dab1f5f34bf3232efa8fb0/results/2026-11-03-wine-observations-verification.md)、[独立审查](https://github.com/zjDing1024/pytorch-from-zero/blob/1c4aaaf7eee34d32b7dab1f5f34bf3232efa8fb0/results/2026-11-03-wine-observations-independent-review.md)和[已安装 CLI 汇总](https://github.com/zjDing1024/pytorch-from-zero/blob/1c4aaaf7eee34d32b7dab1f5f34bf3232efa8fb0/results/2026-11-03-wine-installed-wheel-summary.json)已绑定精确提交；精确提交 CI 的实际结果如下。

## 技术理解

1. `.grad` 是本批 CE 的梯度；SGD 先加权重衰减，再更新动量，因此参数变化一般不是 `−lr × 原始梯度`。
2. 读数要注明时点。梯度对应更新前参数，实际更新需对更新前后参数做差；观测副本不能持有会随原地更新一起改变的别名。
3. 开启观测与关闭观测的最终参数、状态和轨迹对照，回答工具是否改变训练；数值方程对照回答实现是否符合预期，两者不能互相替代。
4. 在线 CE 来自不同批次更新前状态，按样本数加权；最终完整训练集 CE 使用同一最终参数。不能混写，也不能据此声称留出集泛化改善。

## GitHub 变化

- 工程仓库：[pytorch-from-zero](https://github.com/zjDing1024/pytorch-from-zero)。执行前基线 `e3be1f1680c6014ef3238ec66731de2e959ec1e6`。
- 学习仓库：[ai-learning-roadmap](https://github.com/zjDing1024/ai-learning-roadmap)。执行前基线 `659a29c1287f8f94e9effcf9f26f36890f8da626`，43 个文件逐 Git blob 校验后恢复。
- 新增当日日报与源码笔记，更新 README、路线、实验索引和当前能力分析。11 月 2 日三个即时增量和更早记录原字节保留。
- 本轮工程提交：[1c4aaaf7eee34d32b7dab1f5f34bf3232efa8fb0](https://github.com/zjDing1024/pytorch-from-zero/commit/1c4aaaf7eee34d32b7dab1f5f34bf3232efa8fb0)，347 个远端文件与发布清单逐 blob 相符；19 项变更（8 修改、11 新增），无删除。
- 精确提交 [CI #41481970566](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/41481970566)已完成且 **success**，`test` 与 `installed-cpu-container` 两作业成功。
- 远端 source：**1,868 = 1,730 + 59 + 45 + 34** 测试通过；main 耗时 343.07 秒；Ruff lint／164 文件格式通过；**18 个 source CLI** 成功。
- 远端真实 Docker：**18 个已安装 CLI** 成功。没有在容器内运行全量 pytest，不把 source 测试数计为容器测试。
- 两份 artifact 实际下载并校验 API SHA-256 和 ZIP CRC；source 含 20 个 JSON，container 含 1 份完整安装验收报告。两处 Wine 观测均包含六配置、84 批、252 逐参数记录、三路径合计 252 更新／3,852 训练访问；全部七项逐 run 检查通过，最大更新残差均为 `6.245004513516506e-17`。
- source Python 3.12.15、container Python 3.12.14，均 Torch 2.14.1+cpu。各环境内部对照通过，不宣称两环境完整输出逐位相等。保留可选 NumPy 缺失警告及 GitHub Action Node.js 20 弃用／自动使用 24 提示。
- 学习仓库为文档仓库，没有工作流，不宣称其 CI 通过。

## 求职价值与当前能力变化

对应 AI／ML Engineer 的训练可观察性与实验可靠性：把工具接入真实数据，维护既有协议，分开测量、解释与优化，保留非干扰证据。相比继续增加标量 demo，更接近训练代码维护和故障诊断工作。

学习与工程验证按实际证据推进；当前范围仍是小型 CPU 分类任务。GPU、AMP、分布式、含状态层／随机层的通用观测及监控开销尚无本轮证据。可选巩固：解释为何 CE 梯度变小而 momentum 更新仍可保持较大，以及为什么短前缀训练损失不能用来改选历史测试最优模型。

## 不足与明日计划

在本轮验收闭合后，计划比较同一 Wine 训练集上有／无 momentum 的行为，固定初始化、批次顺序、学习率和等更新预算，预声明因果问题、训练指标及评估开销。不做验证选择，不重新使用已看过的测试集调参，不宣称某优化器普遍更好；若没有可信改善，保留负结果。这是下一项计划，尚未运行。
