# AI Engineer Daily Report

日期：2026-10-12（Asia/Kuala_Lumpur；本轮从2026-10-11 16:00 UTC推进）。当前为阶段1第八增量。开始前重读任务书、远端README、路线/实验索引和前一日报；工程与成长仓库每个远端blob均与本地一致后才修改。未重复Wine调参或前日完整捕获器。

## 今日学习主题

固定输入下的数值定位：区分输入差异、显式运算链中的传播、融合API结果和实验控制；保留一个没有观察到差异的负结果。

## 今日研究项目

项目：[PyTorch](https://github.com/pytorch/pytorch)，PyTorch contributors / Foundation生态。固定实际安装revision `5c4886908584029761b579af026dcfb627c84070`。

技术价值：CPU softmax/log-softmax的归约、向量数学与dispatch，以及class-index CE的log_softmax→NLL路径，直接对应当前复现问题。源码结构、学习边界和BSD-3-Clause-style许可见[来源笔记](../../notes/深度学习笔记/2026-10-12-fixed-input-diagnostics.md)和[工程协议](https://github.com/zjDing1024/pytorch-from-zero/blob/main/docs/fixed-input-diagnostics.md)。新增实现、fixture和测试均原创，没有复制上游代码；未创建无独立内容的新仓库。

## 今日完成内容

### 代码与文件

- `src/pytorch_lab/fixed_input_probe.py`：固定输入、14个明确记录边界、严格字节hash及8 ULP诊断、A-B-B-A子进程和独立捕获控制
- `src/pytorch_lab/data/fixed_logits_v1.json`：手写16×3 dyadic logits和16标签；CPU float64、连续stride(3,1)，含正负零和相等logits，不由模型或dispatch生成
- `tests/test_fixed_input_probe.py`：输入/记录/schema、8/9步、预测精确、控制无效、同条件漂移、坏worker与CLI超时/拒绝覆盖
- 新协议/验证文档、README、自测和许可说明；原七条CLI保留，第八条在source工作流与已安装wheel检查器中留存完整报告

### 开跑前计划

[计划JSON](https://github.com/zjDing1024/pytorch-from-zero/blob/main/docs/fixed-input-plan.json) SHA-256：`d444bef6fbbc9a401881262cae13913038855ac1885e2a02d8fe9076ba1e4a6c`。

输入fixture SHA-256：`ea3b9d24cb7466c19fced9c85413f53137238fb36e5d4268d20e81686d299f94`。计划与fixture均在新计算前写定；已有Wine敏感性是已知背景，本次不是盲研究。0次训练更新，无新依赖、GPU、付费资源、测试集选参或新模型。显式softmax链和独立融合API是不同算法路径，不把手拆公式当ground truth。

### 真实实验结果

**本次为AMD EPYC 9V74；前次Wine干预为Intel Xeon Platinum 8573C。** 原计划背景句误写“on this host”，运行后核对硬件时发现；原计划/hash保留，新增[事后更正](https://github.com/zjDing1024/pytorch-from-zero/blob/main/docs/fixed-input-plan-erratum.json)。前次结果没有证明今日主机的完整Wine敏感性，不能把今日负结果直接解释为前次现象已定位。输入、操作和8步标准均未修改。

今日同机四个新解释器按A-B-B-A执行：A为ATEN_CPU_CAPABILITY unset，B为default；实际观测AVX512 / DEFAULT / DEFAULT / AVX512。三种线程环境及torch intra/inter-op线程均为1。输入字节、相等logits控制、非干预运行信息和包文件hash、同条件严格重复全部通过。

[最终四样本原始记录](https://github.com/zjDing1024/pytorch-from-zero/blob/main/results/2026-10-12-fixed-input-reviewed.json)中，14阶段共465值（449个float、16个预测）全部逐位相同，四个科学hash为：

`b3d1cb41c109ccd68ad8ceb49bffcc16069ea6a44f858c940c1840f45e352c95`

严格输出与独立8步门均通过，显式链没有首个不等边界。该负结果限定本fixture/算子/构建，没有支持“这些固定logits的评估受此次干预影响”；不能推广成评估路径普遍不受影响，Wine训练参数和历史CI原因仍未定位。没有修改fixture继续搜索差异。

[审查修补前捕获](https://github.com/zjDing1024/pytorch-from-zero/blob/main/results/2026-10-12-fixed-input-dispatch.json)也保留，科学输出一致；后续仅补JSON元数据有限性防护，因此正式交付使用最终代码重跑的证据。两个四样本捕获不是八个独立数据集，也不构成统计性能结论。

### 问题与修复

独立审查发现坏worker容器类型、缺capability、重复JSON key和元数据中的 `1e999` 可能导致无结构异常或最终序列化失败。现均在接纳样本前做schema/有限数/深度/节点验证，后续worker失败仍保留先前有效证据及脱敏错误。8 ULP合同、fixture、原Wine算法不变。

首次聚焦40 passed / 1 failed仅为新测试手填输出总数513错误，实际应为465；修正计数后新增49项聚焦通过（4.31秒）。原始失败日志保留，未改变任何数值判定。独立审查另外复跑本次/旧比较器/安装失败留存，共77项通过（6.57秒）；不把这个数重复计入仓库测试总数。

## 技术理解

### 今天真正掌握

个人独立自测仍未收到，不宣称学习者掌握。工程材料支持以下理解边界：

1. 冻结字节输入才能排除输入生成差异；只用同一个seed不足以说明中间张量相同。
2. 显式链的第一处不等记录只约束被记录的依赖链；融合API、log分支和反向不应被串成假依赖。
3. mean CE的logits梯度为 `(softmax−one_hot)/N`；数值实现可能有不同舍入位置，数学同值不保证逐位同值。
4. “没有观察到差异”是有用结论，不应事后换输入、放阈值或隐去负结果。
5. 捕获完整/控制有效、严格输出相同和8 ULP内接近必须独立报告；原Wine75/144 ULP失败仍保持失败。

## GitHub变化与验证

新增仓库：无。工程基线 `aa56d5e3ae5ffcee428d1f4c996a04497df7bb7e`；成长基线 `a5cc07e1931b8ad2f118c3d83018b02323d3ba4b`。旧源码、测试、原始结果和计划不覆盖；变更聚焦新固定输入工具及其交付/记录。

本地完整pytest **880 passed/225.17秒，0失败/错误/跳过**；最终聚焦49项和独立77项检查也通过，互不重复计数。Ruff、41个拟发布Python文件格式、compileall、两个环境pip check通过。source与新noneditable wheel各八条CLI实际通过，两个路径各7份保留样本的25项包文件hash与最终源码一致。wheel SHA-256为 `4566d27fa000b4eb2834bac20a649323e6edacad89e853dadbbce2897ed5d004`。[工程验证记录](https://github.com/zjDing1024/pytorch-from-zero/blob/main/results/2026-10-12-fixed-input-verification.md)是详细状态入口。

公开提交、精确SHA的source/container CI及artifact检查尚未执行；本阶段仅完成本地准备，不能沿用昨天的绿灯。本机无Docker/Podman；本次容器是否运行待正式提交后的GitHub CI证明。成长仓库没有工作流，不宣称CI通过。

建议工程commit：`feat: add fixed-input dispatch diagnostics with staged evidence`。
建议成长commit：`docs: record fixed-input numerical investigation and negative result`。

## 求职价值分析

对应AI/ML/Research Engineer的最小可证伪实验、算子依赖分析、输入与输出证据治理、负结果解释、失效报告留存。它改善作品的可复查性，仍不能证明生产规模训练、跨平台误差保证、GPU或个人独立排障能力。

## 当前能力变化

新增的是可运行工程证据，个人能力仍待独立解释与重写。当前最重要的缺口是把固定输入方法应用到真实训练初始参数/第一步边界，且不要将本次合成负结果外推。

## 明日计划

1. 先独立画出本次依赖图，推导CE梯度，解释为什么本次全相同与此前Wine全流程不同不矛盾。
2. 另行预声明冻结真实训练输入和初始权重的一次forward/loss/gradient/update定位。保持依赖、线程和模型设置不变；先定输入/比较边界，再运行。
3. 保持旧严格hash与8 ULP失败结论；不在看过的Wine测试集调参，也不为增加仓库数量跳到大型Agent系统。
