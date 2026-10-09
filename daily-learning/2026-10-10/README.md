# AI Engineer Daily Report

日期：2026-10-10，Asia/Kuala_Lumpur（UTC+08:00；执行起点对应2026-10-09 UTC晚间）。执行方式：AI助理研究、实现与工程验证。个人独立理解仍待自测。

## 今日学习主题

从已有Wine真实数据实验进入CPU运行时复现：依赖wheel字节、干净安装、源代码之外的CLI、进程资源计量与CPU容器测试路径。开始前已读取完整长期目标、当前路线和最近日报，并逐一核对远端66个工程文件与11个成长文件；不重复Tensor/训练/恢复/momentum/StepLR/Wine实现。

## 今日研究项目

- 项目：PyPA pip，https://github.com/pypa/pip
- 作者/维护：PyPA生态的pip developers；MIT许可证
- 解决问题：Python包发现、依赖解析、构建和安装的可信边界
- 核心技术/结构：`src/pip/_internal`、`_vendor`、`tests/functional`、`docs/html`；使用稳定CLI，不依赖内部API
- 固定源码：25.1.1对应提交01857ef79f59a98db592bacb6e7b48f354528c80；实际阅读hashes.py、commands/wheel.py及functional/test_hash.py
- 值得学习：哈希allow-list、缺失/不匹配的失败分支、获取与构建分层，以及实际安装CLI负对照
- 适合当前阶段：前日算法数值可靠仍不保证换目录/环境后安装可用；优先把现有项目交付边界做实，不增加新框架
- 借鉴：原创实现资源探针和检查器，使用pip公开命令，没有复制上游实现
- 辅助研究：Docker Community维护的Python Official Image，固定源码688a0b86bb44289df16a363e9f41d90514c1a5f9（MIT）；版本/校验/构建依赖清理。Python镜像基础digest已查询官方registry，层拉取与容器执行仍须独立证明

[源码与理解笔记](../../notes/深度学习笔记/2026-10-10-runtime-reproducibility.md)包含官方来源链接与学习边界。

## 今日完成内容

### 代码与文件

继续扩展[pytorch-from-zero](https://github.com/zjDing1024/pytorch-from-zero)，没有为了数量另建仓库。

- CPython3.12/Linux x86_64/CPU专用的10个运行依赖wheel SHA-256锁，分别从官方PyTorch CPU索引和PyPI获取
- 新建不继承系统site-packages的venv，用本地wheelhouse完整哈希校验安装；自产项目wheel在源码目录外用`python -I`运行
- 原创`runtime_probe.py`：固定Wine工作量、每样本新进程、线程约束、wall/CPU/RSS、科学结果和安装代码/数据hash、超时与防覆盖
- 原创`check_installed.py`：拒绝editable、校验distribution导入位置、六条CLI、子进程组超时清理
- 新增75项聚焦测试；包含真实子/孙进程超时清理，不只mock成功路径
- 两阶段、非root、输入白名单Dockerfile；CI最小矩阵为source全量检查与container已安装wheel六条CLI
- README、运行时协议、个人自测、后续计划、原始JSON与安装/产物证明

### 实验与真实结果

仍运行前日固定协议，未重新搜索超参数或挑选模型。每样本包含两个预声明架构、三个种子、每次120轮，合计5,040次更新/77,040次样本访问。source与干净wheel分别3次新进程测量，六个科学输出SHA-256都与前日Wine完整结果一致：`b7ab96864bf8265cc5ec54c7318cb65bc78cbb0404174ef868a803ce3eb75fc1`。

观测均为CPython3.12.14、torch2.14.1+cpu、Linux x86_64、glibc2.41。初始源码开发环境还可见额外系统包；干净wheel环境仅运行闭包、项目与pip。数值重复性成立不意味着环境完全相同，也不意味wall/RSS应相同。

正式资源数值见[运行时协议](https://github.com/zjDing1024/pytorch-from-zero/blob/main/docs/runtime-reproducibility.md)、[source原始JSON](https://github.com/zjDing1024/pytorch-from-zero/blob/main/results/2026-10-10-runtime-source-cpu.json)和[wheel原始JSON](https://github.com/zjDing1024/pytorch-from-zero/blob/main/results/2026-10-10-runtime-wheel-cpu.json)。共享宿主同时有测试活动、额外包不同，没有做受控速度比较，不从计时/RSS差异宣称优化收益。

真实安装负对照：篡改wheel一个字节被pip哈希验证拒绝；缺少wheel时本地安装失败；editable安装被wheel检查器拒绝。干净安装pip check与六条CLI通过。原有全部源码、测试、数据/许可及历史原始结果保持不变。

## 技术理解

### 今天真正掌握

学习者状态仍为待自测。本次工程证据验证的理解：

- 哈希锁固定依赖产物，科学hash固定输出；二者都不等于自产wheel逐字节重建或跨平台确定性
- `--no-index`不是网络隔离；`-I`排除环境路径不等于拒绝editable；必须分别验证
- fresh process不等于cold cache；初始导入、懒加载、线程数与宿主负载影响计量
- Linux ru_maxrss是启动以来进程高水位，KiB除1024得MiB，不能当作训练分配量或容器总内存
- 只杀超时父进程可能留下孙进程；本次独立审查发现该问题后，加入进程组清理与真实后代测试
- 已解析镜像manifest不等于镜像成功构建或运行；不同验证层必须分别记录

### 遇到的问题

本机无Docker/Podman/buildah/buildctl/runc，因此先完成干净wheel路径；后续精确提交的GitHub CI已经实际执行容器build/run。没有更改主机安全设置、使用GPU或付费算力。最小环境未安装可选NumPy，会有一条PyTorch提示；实验完全使用torch，pip check和实际工作量都通过。独立审查还指出计时可能包含PyTorch懒加载，已把“排除导入”缩窄为“排除初始导入与线程设置”。

## GitHub变化

- 新增仓库：无
- 修改前基线：工程bd5ba6883bee133f2fdbd68ebda168edea0ae767；成长记录1d680ae56851d036b0ccc17b542e3e87ac29a384。逐一校验当时66/11个远程文件与本地一致
- 本地最终冻结代码784项通过（217.02秒），独立全量784项通过（235.07秒）；75项新聚焦检查、Ruff/格式、compileall、pip check和6条已安装wheel CLI通过
- 工程80个文件：feature为19个修改/新增（14个新增），其后修复1个CI文件，再补记4个Markdown。43个旧源码/测试/原始JSON及原数据/许可保持字节不变，零删除；各次发布全量Git blob与冻结清单一致，使用expected-SHA及非强制快进
- 成长13个文件：本次7个修改/新增（2个新增），旧日报和历史来源记录保留；成长仓库没有CI

初次[工程114a5a1](https://github.com/zjDing1024/pytorch-from-zero/commit/114a5a1857975ca7d20a99a45b26def291ac8ab2)的[运行#37958785497](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/37958785497)因YAML plain scalar内的冒号空格在解析阶段失败，没有source/container job执行。改用block scalar后，原错误fixture被拒绝、新工作流通过PyYAML/官方actionlint1.7.12和15个run块的bash -n；独立确认其余79文件未变。Python全量测试没有覆盖这类工作流语法错误，本次保留失败与修复经过。

[修复后工程e162eaf](https://github.com/zjDing1024/pytorch-from-zero/commit/e162eafd654e44bfea3473c391491fa071b443d0)的[CPU checks #37959687015](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/37959687015)，以及4份Markdown补记后的[最终工程17aed9e](https://github.com/zjDing1024/pytorch-from-zero/commit/17aed9e5ea934807477652cabbc35a4de8c86a7e)的[CPU checks #37961087696](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/37961087696)均已成功。两次精确SHA的source job通过784项测试、Ruff/格式和6条CLI，container job真实完成Docker构建及非root/只读/断网的6条已安装wheel CLI。source测试分别为243.42秒与209.44秒，各有1条可选NumPy警告。

最终工程完整SHA：`17aed9e5ea934807477652cabbc35a4de8c86a7e`；修复后feature完整SHA：`e162eafd654e44bfea3473c391491fa071b443d0`。原始本地JSON保持发布前实测记录，不回写CI结果；[完整工程验证](https://github.com/zjDing1024/pytorch-from-zero/blob/main/results/2026-10-10-runtime-verification.md)保留执行与审查细节，本日报补齐最终文档提交CI。

### 实际跨环境重复性边界

需要按run/job逐项记录，不能把source或container当成固定数值类别：

| 观察 | 重复次数 | canonical科学SHA-256前缀 |
|---|---:|---|
| 本地source + wheel | 3 + 3 | b7ab9686… |
| feature #37959687015 / source job113919046724 | 2 | b7ab9686… |
| feature #37959687015 / container job113919046357 | 3 | 28ce527e… |
| 最终 #37961087696 / source job113923794801 | 2 | 28ce527e… |
| 最终 #37961087696 / container job113923795179 | 3 | b7ab9686… |

完整hash分别为`b7ab96864bf8265cc5ec54c7318cb65bc78cbb0404174ef868a803ce3eb75fc1`与`28ce527e3828b3d49a30a4be246ae4c1c19a38f20f4eb561450484a88ba94ab5`。每个job内部重复一致，跨run/job的canonical输出字节实际出现不一致；两次CI的source/container映射交换，不能称为稳定的容器效应。

各次21个包代码/数据/许可hash与10个依赖版本一致。容器均为Python3.12.14/glibc2.36，本地为3.12.14/2.41，source CI均为3.12.15/2.39；记录的这些字段不足以解释差异，不能把原因归给Python、libc或硬件。

最终source job公开完整Wine JSON，其canonical科学hash确认为28ce527e…，与先前容器记录的科学hash相同。将该完整输出与本地b7ab9686…输出比较，只排除created_at_utc和environment：6,609个数字叶节点中1,299个float值不同，最大绝对差为3.608224830031759e-16。结构/类型/非数字值相同，验证选择仍为mlp16，所有预测、混淆矩阵与准确率保持相同。这些计数是JSON字段数量，并非独立重复实验次数。

这是该两份实际输出的数值差异测量，没有通过改模型、挑seed、舍入输出或修改检查阈值消除不匹配。尚未建立原因，也没有建立面向任意环境/输入的容差保证。工程仓库文档补记记录的是较早feature CI观察，本日报在最终CI完成后补充此完整比较。

feature容器image ID为`sha256:51d25af1f3036ce8cf2bc76a322563c593f00f7461270528df89cd4a9e16a59c`，最终文档容器image ID为`sha256:21b6ebc4101d3cad39edad972fb97a6c89b73b9f8e79d2354adcdfc49ccbfb58`；两次都以UID/GID10001:10001运行。这是各次CI构建产物ID，没有发布容器镜像到registry，也不声称镜像可逐字节重建。

## 求职价值分析

对应AI Engineer/ML Engineer的交付与诊断基础：可检查的依赖来源、干净环境交付、失败即停止、数值回归、资源定义和超时进程治理，比继续累加同类训练demo更接近工程可靠性。

不足：仍是小型CPU离线实验；没有服务部署、并发负载、GPU、真实生产成本/SLO、漏洞扫描或跨平台验证。容器已获得实际CI执行证据，但仍只覆盖该小型CPU工作量；本次已量化两个完整科学输出的末位差异，成因和一般容差仍待研究。个人独立解释/实现仍未验证。

## 当前能力变化

新增工程材料为运行时边界与资源实测；没有自动升级个人技能状态。依赖锁覆盖有限目标平台，基础镜像固定不代表最新安全版本，后续更新要重新检查。

## 明日计划

1. 发布与两次精确工程提交的source/container CI已闭合；下一工程任务系统保留完整科学JSON与更充分的CPU/运行信息，调查两类末位数值出现的条件，并在新实验前声明容差回归标准；不能把本次最大差直接当成普遍保证或放松现有检查。
2. 收集独立自测：新环境安装、no-index/-I/网络隔离、RSS与子进程超时，以及为何同一次重复通过不等于跨运行逐位一致。
3. 建立可解释的跨运行回归边界后，再选择受控单因素profiling或依赖/基础镜像升级兼容性实验。
4. 不重复Wine测试集调参，不因助理生成工程材料就跳到大型模型或Agent阶段。
