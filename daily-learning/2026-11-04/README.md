# AI Engineer Daily Report：重建固定参数梯度实验

日期：2026-11-04，Asia/Kuala_Lumpur。阶段1：PyTorch。

## 先核对已有工作与重建边界

已读取任务书、最新路线／实验索引及11月3日动量报告。此前未提交的梯度实验原始工作区在恢复后不可用；本轮为新实现、新协议与新运行，不是找回原件。旧聊天报告的1952测试、1842调用等数字不作为今天证据。此次固定每种批大小32次抽样，预算与旧实验不同。历史公开文件保持原字节，工程继续进入已有独立仓库，不新增空仓库。

## 研究项目与技术价值

研究 [PyTorch](https://github.com/pytorch/pytorch) 的 autograd.grad、交叉熵归一化及 BSD-style 许可，具体官方链接与原创推导见[研究笔记](../../notes/深度学习笔记/2026-11-04-gradient-sampling.md)。用途是理解梯度累积、尾批处理与抽样误差，避免把梯度估计误差和训练轨迹混为一谈。数据沿用 UCI Wine 的 CC BY 4.0 授权，不发布私有内容或凭据，不使用收费资源。

## 实际代码和实验

新增 wine_gradient_sampling.py、对应 CLI、冻结协议、原始结果、核心／CLI／独立测试；更新工程 README 和交付入口。精确提交的[核心实现](https://github.com/zjDing1024/pytorch-from-zero/blob/3cc0c37620e376061952951f6b26597430c92bdb/src/pytorch_lab/wine_gradient_sampling.py)、[CLI](https://github.com/zjDing1024/pytorch-from-zero/blob/3cc0c37620e376061952951f6b26597430c92bdb/src/pytorch_lab/wine_gradient_sampling_cli.py)、[冻结协议](https://github.com/zjDing1024/pytorch-from-zero/blob/3cc0c37620e376061952951f6b26597430c92bdb/docs/wine-gradient-sampling-plan.json)、[原始输出](https://github.com/zjDing1024/pytorch-from-zero/blob/3cc0c37620e376061952951f6b26597430c92bdb/results/2026-11-04-wine-gradient-sampling.json)、[本地验收](https://github.com/zjDing1024/pytorch-from-zero/blob/3cc0c37620e376061952951f6b26597430c92bdb/results/2026-11-04-gradient-sampling-verification.md)与[独立审查](https://github.com/zjDing1024/pytorch-from-zero/blob/3cc0c37620e376061952951f6b26597430c92bdb/results/2026-11-04-gradient-sampling-independent-review.md)均保留。

- 107训练行、仅训练集拟合标准化；linear与MLP，两架构各seed42/7/123。
- 固定初始化，eval模式，CPU float64单线程。无优化器、无weight decay、无参数更新。
- 静态分区六个16条批加一个11条尾批；随机子集大小4/16/64，每种32次。每次抽样内无放回，各次可重叠，专属seed为 model_seed×1000+batch_size。
- 每模型1次完整梯度、107次逐样本梯度、7次分区梯度、96次随机梯度：211调用／3009样本访问。六模型合计 **1266梯度调用、18054样本访问、0更新**。测试和其他交付回归另有成本。
- 加权分区最大绝对误差≤2.220446049250313e-16；等权平均批梯度误差L2为0.07795060920469293–0.09396175119916425。
- 18个模型／批大小组合的经验与理论平方误差比为0.762392084431612–1.2375402944172407。有限抽样波动不设通过阈值，不据结果改变协议。

原始输出 SHA-256：c128f5510554f4f14282f34bc689b6f6338607a9c65add9646165ee6af588c53。全部确定性控制通过。独立8项测试实际通过（1.40秒），以1e-14核对解析线性梯度、捕获的子集张量与逐样本均值；穷举小总体全部子集验证理论。污染留出特征为NaN、标签为−100，禁止重新划分和SGD更新，forward守卫实测1266／18054／0。参数、已有.grad、CPU RNG及调用者线程状态保持。8项包含于完整套件，不重复计数。

## 验收与发布

本地完整主套件 **1812 passed，366.70秒**；三个独立脚本包59／45／34项通过，总计 **1950 = 1812 + 59 + 45 + 34**。新增39项（11核心、20CLI、8独立审查）。聚焦31项与独立8项属于总数，不再累计。Ruff lint、最终180文件格式检查、compileall、pip check通过；早期178／中间179是不同阶段观察，不混为最终数。保留可选NumPy缺失警告。

全新离线非editable wheel实际20个已安装CLI通过；49个包文件在source／wheel／安装目录逐字节一致，沿用10个官方来源的哈希锁依赖。新梯度JSON在同一运行环境与source原始输出相同；不是跨环境逐位复现证明。未运行本地Docker或安装环境全量pytest。

开发阶段修复初始手写格式的行长问题；旧19入口列表在完整运行前更新为20项，没有删除旧命令、放宽阈值或改变预算。此次完整套件未报告旧Nov3的失败，那是遗失版本的历史记录，不能复制为今天发生的错误。

工程变更21文件（10修改、11新增），最终369文件，无删除。冻结计划SHA256为 `3fd206d745f1c95e8d2f320707528b0724f1f7ea91eece81990448cf0667fa8c`。

工程仓库 [pytorch-from-zero](https://github.com/zjDing1024/pytorch-from-zero) 已发布提交 [3cc0c37620e376061952951f6b26597430c92bdb](https://github.com/zjDing1024/pytorch-from-zero/commit/3cc0c37620e376061952951f6b26597430c92bdb)，main与369个远端文件逐blob校验一致。学习仓库 [ai-learning-roadmap](https://github.com/zjDing1024/ai-learning-roadmap) 基线9be4c46006e8895cc4ab7471ff4434c293b7d35e的47个文件已逐blob恢复；新增本日报与研究笔记，更新四个索引，历史日报保持原字节。学习仓库没有CI工作流，不宣称其CI通过。

精确提交 [CI #41756589129](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/41756589129)已完成且 **success**，source与installed-cpu-container两作业成功。远端完整source为 **1950 = 1812 + 59 + 45 + 34**，主套件370.09秒，另三套5.16／5.38／1.267秒；Ruff lint及180文件格式检查通过。实际20个source CLI、真实Docker内20个已安装CLI通过；容器未运行全量pytest。

两份artifact已下载并通过API SHA-256与ZIP CRC校验，source包含22个JSON，container包含1份完整安装验收报告。两处新梯度报告均为六配置、1266调用、18054访问、零更新，所有确定性检查通过；加权误差上界、等权误差范围与经验／理论比范围均符合本页记录。

source Python3.12.15，container Python3.12.14，均Torch2.14.1+cpu。只陈述各环境内部验收通过，不宣称完整跨环境输出逐位相等。保留可选NumPy、Action Node20强制使用24、punycode／url.parse弃用以及镜像构建pip root提示；实际容器验收以非root运行。历史Wine完整交付回归另行评分留出集，未用该输出调整本次实验。

## 技术理解、求职价值与能力边界

按样本数加权的分区恒等式，与随机抽样的期望正确性，是两个不同层次。固定点的梯度抽样不能直接回答训练速度。实际实现与独立检查可展示AI／ML Engineer的数值验证、实验设计和训练调试能力；不会把助手完成的验证写成人已独立掌握。

可选本人巩固：推导尾批权重与有限总体修正，解释为什么有限抽样经验误差不等于估计器有偏。继续推进不以个人自测为门槛。不足是小数据、固定初始化、CPU float64，尚无GPU、AMP、分布式或泛化证据。

## 下一步

进入真实batch16／32训练的双预算对照：等样本访问各214次时更新14／8次；等14次更新时访问214／385次。先冻结共同索引排列并保留尾批，不能仅由相同DataLoader seed推断顺序相同。两个问题分开解释，均不等于等时间；momentum与衰减按更新作用，不称为纯噪声效应。该新训练协议尚未执行。
