# AI Engineer Daily Report

日期：2026-10-11，Asia/Kuala_Lumpur（UTC+08:00）。初始实现与本地审查于2026-10-10 UTC晚间开展；公开发布、CI修复和文档闭合于2026-10-11 UTC继续完成，均在本日报日期内。执行方式：AI助理研究、原创实现、真实实验与独立工程审查。个人独立能力仍待自测。

## 今日学习主题

从“同一个job重复通过”推进到“跨运行完整证据与明确比较合同”。今天没有换模型、调Wine测试集或增加仓库；先读完整长期目标与最新路线/日报，再核对远端80个工程文件、13个成长文件，恢复最新第六增量后开展第七增量。

## 今日研究项目

- 项目：PyTorch，https://github.com/pytorch/pytorch
- 维护：PyTorch contributors / Foundation生态
- 解决问题：张量计算、自动微分与多后端执行；本次关注CPU dispatch和测试比较边界
- 固定源码：安装版本对应git revision `5c4886908584029761b579af026dcfb627c84070`
- 实际阅读：`aten/src/ATen/native/DispatchStub.cpp`、`torch/testing/_comparison.py`、根LICENSE
- 结构：torch Python API、aten/native计算实现、c10底层设施、test与docs
- 值得学习：capability缓存/实现fallback，结构遍历/数值策略/错误路径分离；请求值必须和有效值分别记录
- 当前适配：前日已发现两个科学hash，先建立能否定位/拒绝差异的证据，比累加训练demo更有价值
- 许可：BSD-3-Clause-style根许可，依赖另有通知；新增代码原创，没有复制上游实现或调用私有比较API

[源码理解笔记](../../notes/深度学习笔记/2026-10-11-numerical-regression.md)保存官方来源、借鉴范围与局限。

## 今日完成内容

### 代码与文件

继续扩展[pytorch-from-zero](https://github.com/zjDing1024/pytorch-from-zero)：

1. `numerical_probe.py`在每次独立进程保留完整Wine JSON、原始canonical科学hash、计量与包代码/数据hash。
2. 记录CPU型号/feature集合、affinity、kernel、binary64属性、torch git/build摘要、ATen capability、MKL/oneDNN/OpenMP信息和白名单环境控制；不dump用户路径、hostname、机器ID、serial、全量环境或secret。
3. `scientific_compare.py`用明确路径合同区分严格hash、必须精确的字段与连续值8相邻binary64步诊断。结构/type、非有限输入、重复key、未知字段默认精确和边界都显式处理。
4. 原六条安装CLI与原runtime严格hash门保持，新增第七条完整捕获。worker或后续CLI失败时保留已完成证据、脱敏失败类别并返回非零。
5. CI增加source/container完整JSON artifact留存30天；长期正式实验仍进results。旧训练源码/数据许可/历史结果保留；原runtime worker增加可选完整结果开关。旧测试文件的两项例外为runtime CLI外层监督预算公式，以及发布后installed checker对已消失进程的/proc观测修复；原测试case和科学断言全部保留。
6. feature阶段新增44项聚焦测试，发布后再加3项进程观测回归，共47项新增；不靠重复参数组合堆数量。feature测试包含8/9步、符号零、subnormal、指数边界、overflow、精确配置/离散反例、真实CLI、拒绝覆盖、部分失败留存。

### 开跑前写下的判定

[计划JSON](https://github.com/zjDing1024/pytorch-from-zero/blob/main/docs/numerical-regression-plan.json)在新Wine实验前固定，SHA-256：`f2e643ebc643406e380b9266e1e52cc7d8ff8bef8e3a578aad9893a1ac1b99c8`。

严格科学hash口径不变，只排除顶层时间/环境。所有结构、类型、协议配置、数据、seed、预测、混淆矩阵、架构选择和计数型指标精确一致；只有白名单连续输出允许最多8个相邻有限binary64数的距离，无非零absolute floor。

8步是刻意严格的调查预算，不是训练累计误差的理论保证，也不是看完结果后调出的“通过线”。先前最大绝对差已知，因此不是盲研究。此次实际超限会保留失败，不把阈值改成75或144来过关。

### 历史完整输出重新检查

从[最终source job113923794801](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/37961087696/job/113923794801)恢复完整Wine JSON，保留原数字类型并重算，确认其科学hash为28ce527e…；与前日保存的b7ab9686…比较：

- 6,609个数字叶节点；其中3,769个float，3,514个属于连续值白名单
- 1,299个float值不同：31个历史loss、26个CE/汇总、1,242个概率字段
- 最大绝对差：3.608224830031759e-16
- 最大ULP距离：75；932个连续值超过8步
- 精确结构、配置、预测、混淆矩阵、计数指标和选中架构均相同
- 结论：严格hash失败、连续数值诊断失败，精确字段门通过。不是模型质量退化结论

[恢复的原始输出](https://github.com/zjDing1024/pytorch-from-zero/blob/main/results/2026-10-11-prior-ci-wine.json)与[最终比较报告](https://github.com/zjDing1024/pytorch-from-zero/blob/main/results/2026-10-11-prior-reviewed.json)完整保留。这些是字段数，不是独立实验重复数。

### 单因素真实实验

同一Intel Xeon Platinum8573C主机、同一解释器/代码/数据、固定线程和Wine配置。A为ATEN_CPU_CAPABILITY unset，B为default；新进程按A-B-B-A执行，120轮、每样本6次拟合/5,040更新/77,040样本访问。

最终冻结代码的[完整四样本报告](https://github.com/zjDing1024/pytorch-from-zero/blob/main/results/2026-10-11-dispatch-reviewed.json)：

| 条件 | 实际capability | 两次科学hash | 结果 |
|---|---|---|---|
| A | AVX512 | 28ce527e… | 同条件严格重复 |
| B | DEFAULT | d6e828f3… | 同条件严格重复 |

所有非干预控制/包文件hash、同条件运行信息及严格重复检查通过，干预确实改变已报告capability。A/B有1,441个float差异，最大绝对差4.440892098500626e-16，最大144 ULP（CE sample_std字段），1,024项超过固定8步；精确字段零差异。

这支持“此主机/构建上的ATen dispatch干预改变科学输出”。B是第三种hash，并没有重现历史b7ab/28ce这对差异；旧CI缺硬件信息，历史原因仍未确立。ATen并不控制全部MKL/oneDNN，不宣称已找到具体kernel原因，也不根据共享宿主wall时间作性能结论。

## 技术理解

### 今天真正掌握

学习者仍待独立自测。工程证据验证了以下区分：

- 严格hash、精确离散结果与数值接近是三个命题；不能把后两个改写成逐位一致
- 微小绝对差仍可跨很多相邻float；最大绝对差与最大ULP不一定在同一字段
- binary64步距需处理零/符号/指数边界，不能简单除以单侧ulp
- 8步失败是调查信号；不是精度对实数的误差界、模型正确性或泛化的证明
- 环境请求值不等于实际dispatch，更不等于每个算子的执行轨迹
- 失败证据也是交付内容；把success布尔标成false还不足够，完整已完成输出也应保留

### 遇到的问题与真实失败

独立审查发现后续child失败会丢失已完成captures，已经修复并加入失败后留存测试。一次复跑与审查修改代码重叠，包hash控制门正确失败；该[中途变更快照](https://github.com/zjDing1024/pytorch-from-zero/blob/main/results/2026-10-11-dispatch-interrupted.json)保留，不能用作受控实验结论。初次安装检查遇到跨CLI重新安装，旧/new包hash不同，保留为prefreeze材料，仅最终冻结后的安装报告作为证明。

没有通过删除失败、改seed、舍入概率或放宽阈值制造成功。没有GPU、付费算力、主机安全修改或镜像发布。具体工程检查与最终发布状态见下节及工程验证记录。

## GitHub变化

新增仓库：无。修改前工程HEAD `17aed9e5ea934807477652cabbc35a4de8c86a7e`；成长HEAD `b2fe45be071883791d15fea6b9c5020a2f9547ff`。原先本地副本过期，先逐一校验并同步远端，保留旧副本；没有用过期文件覆盖最新成果。

最终聚焦48项通过（42个新增 + 6个旧安装检查器测试）；Ruff、39个拟发布Python文件格式、compileall、pip check通过。独立完整826项全部执行、0 skipped，实际825 passed / 1 failed（952.45秒）。唯一失败为旧runtime双新进程测试的外层60秒超时，没有产生输出；同一测试、同一60秒限制单独重跑1 passed（29.40秒）。不将单项成功拼成“826全过”。之后发现旧测试外层60秒预算小于2个顺序child各300秒的合法内层预算，现只把测试helper改为child预算总和+60秒启动/报告余量；生产deadline、0.001秒超时负对照和全部科学断言不变。另增2个监督预算测试；预算及真实CLI/超时负对照6项通过（43.66秒）。修复后完整828项全部通过（906.70秒，退出0，0失败/错误/跳过），JUnit与冻结代码核对一致。完整失败和重跑证据分开保存，随后另按精确SHA验证远端发布。此前session中断的758个完成点也不计全量通过。

最终冻结wheel的7条CLI实测通过；另行比较器同文件strict退出0、历史差异退出1并保留报告。五个runtime/numerical样本的包文件hash均与最终源码一致。工程98文件，feature为27修改/新增（18新增），发布后另修复1个旧测试文件；52个其余受保护旧源码/测试/结果文件字节不变，零删除；成长15文件，本次7修改/新增（2新增），旧日报/来源笔记保留。完整命令和局限见[工程验证](https://github.com/zjDing1024/pytorch-from-zero/blob/main/results/2026-10-11-numerical-verification.md)。

首次公开feature完整SHA：`6765eac6ddbf00bb13d89f02e15810c20b4f1a1e`；其[CI #38131487107](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/38131487107)为source 827 passed / 1 failed（167.96秒），container成功。旧测试读取刚消失进程的/proc stat时遇到ProcessLookupError（ESRCH），并非科学比较失败；source后续CLI未运行，always-upload因没有文件而失败。该失败run保留。

只修复`tests/test_installed_checker.py`的进程终止观测器，在ENOENT之外接受ESRCH；活进程仍失败、无关错误仍抛出。新增3个回归用例，独立11项聚焦检查与9项额外探针通过，真实/proc竞态及恢复旧代码后的失败也复现。生产进程清理、deadline、训练数据/配置、严格SHA和8步诊断均不变。

[修复后工程025a1d7](https://github.com/zjDing1024/pytorch-from-zero/commit/025a1d7da1b68ccd1965b9bfb355eba643ee7505)的[CPU checks #38132126861](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/38132126861)已通过；随后仅补记3份Markdown的[最终工程aa56d5e](https://github.com/zjDing1024/pytorch-from-zero/commit/aa56d5e3ae5ffcee428d1f4c996a04497df7bb7e)及其[CPU checks #38132800285](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/38132800285)也已通过。两次精确SHA的source均通过831项测试、Ruff/格式与7条CLI；container均完成实际镜像构建和非root、只读、断网的7条已安装wheel CLI，两路artifact上传成功。

- 修复后完整工程SHA：`025a1d7da1b68ccd1965b9bfb355eba643ee7505`，完整831项测试186.64秒、1条可选NumPy警告
- 最终文档补记完整SHA：`aa56d5e3ae5ffcee428d1f4c996a04497df7bb7e`，完整831项测试202.42秒、1条可选NumPy警告
- 3份文档补记之外的95个文件逐一核对不变；所有原始科学JSON、失败快照和固定计划均保留。最终工程98个Git blob与本地清单一致
- 原工程基线到feature、测试修复、文档补记均使用expected-SHA及非强制快进。成长仓库15文件、本次7修改/新增（2新增），8个旧文件不变；没有工作流，不宣称成长仓库CI通过
- 本机仍未执行Docker；容器证据来自上述两个精确工程SHA的远程任务。修复run的两份ZIP均下载并与官方SHA-256校验，9个runtime/numerical样本各23个包文件hash与冻结源码一致
- 修复run的source/container均记录AMD EPYC 9V74/AVX512及b7ab…科学hash；本地Intel/AVX512为28ce…，capability标签单独不足以确定输出，历史原因仍未闭合。最终文档run也独立下载/核验了两路ZIP和9份样本的23个包hash：source为AMD EPYC 9V74/AVX512、b7ab…，container为Intel Xeon Platinum 8370C/AVX512、28ce…；两者完整输出比较再次得到1,299个float差异、最大75 ULP、932项超过8步，精确字段全部通过，严格hash和8步诊断仍失败。这是不同宿主间的观察，尚未隔离具体成因
- 最终[source ZIP](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/38132800285/artifacts/11700131170)的SHA-256为`53ff71d07ceff8c48212a04ece98362a8fd8005b63500c40a8eb9221205e3d90`；[container ZIP](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/38132800285/artifacts/11699258759)为`fb4837dd7995bcb8106fe5f78be66db65e5e68f72b1fa24e5fa1ecded01410b9`，均与GitHub元数据核对
- CI artifact保留30天，到期前可从对应run下载；长期正式原始记录在工程results目录中。软件CI通过不代表历史或跨dispatch的8步诊断通过

后续按下方明日计划推进，已完成的捕获器、比较器及本次测试观测修复不重复实现。

## 求职价值分析

对应AI/ML Engineer的复现实验、科学数据治理、诊断与失败边界设计：对数值稳定性提出可复查、可证伪的合同，并愿意公开保留未通过的结果。对Research Engineer也有价值，但仍是小型CPU历史任务，不等于生产SLO、跨平台保证或论文新贡献。

## 当前能力变化

新增的是可运行工程材料与研究方法。个人独立解释、实现和定位尚无新证据，不升级为已掌握。数值gate仍失败，历史原因未闭合；这些真实缺口比绿色测试数量更值得后续推进。

## 明日计划

1. 完成个人自测：手写8/9步、符号零/near-zero，解释exact/approx分层，以及为何当前dispatch对照不能归因旧CI。
2. 以固定输入预声明逐阶段/逐算子最小对照，定位最早数值差异；区分训练路径与评估softmax变化，不同时换依赖/线程/硬件等多个因素。
3. 继续保留完整科学JSON和CPU运行证据；如果未来需要应用级误差预算，先定义真实决策需求并版本化协议，不事后抬阈值。
4. 依赖/镜像升级另作兼容性任务；不重复Wine测试集调参，不为仓库数量跳向大型模型/Agent。
