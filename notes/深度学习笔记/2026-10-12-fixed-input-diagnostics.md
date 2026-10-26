# 固定logits、运算边界与负结果

日期：2026-10-12（Asia/Kuala_Lumpur）。本次研究服务前日的数值差异定位；实现/实验由助理完成，个人独立理解仍待自测。

## 项目分析

- 项目：[PyTorch](https://github.com/pytorch/pytorch)，PyTorch contributors / Foundation生态
- 问题：张量与自动微分的多后端实现，CPU向量化/归约的数值行为
- 固定revision：`5c4886908584029761b579af026dcfb627c84070`，与当前实际安装torch git信息对应
- 结构：ATen native CPU softmax/log-softmax；LossNLL loss组合；cpu/vec各向量宽度数学入口
- 当前阶段：直接改善CPU复现实验的因果边界，比跳到新框架更有价值
- 借鉴：固定输入、按依赖记录、明确分离输入/控制/严格输出/近似诊断，不复制实现

## 实际阅读

[SoftMaxKernel.cpp](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/aten/src/ATen/native/cpu/SoftMaxKernel.cpp)的最后维度路径记录max、vector exp、sum与倒数归一化，并有AVX512 dispatch注册。[LogSoftmaxKernelImpl.h](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/aten/src/ATen/native/cpu/LogSoftmaxKernelImpl.h)使用exp归约、log和明确顺序的减法。改变结合顺序或改成 `log(softmax())` 不承诺相同数值。

[LossNLL.cpp](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/aten/src/ATen/native/LossNLL.cpp)的普通类别索引/无平滑路径组合log_softmax与NLL。本次独立捕获per-row CE、mean CE及logits梯度，数学关系为 `(p−one_hot)/N`，不通过概率先取log替代原API。

[vec512_double.h](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/aten/src/ATen/cpu/vec/vec512/vec512_double.h)、[vec256_double.h](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/aten/src/ATen/cpu/vec/vec256/vec256_double.h)与[vec_base.h](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/aten/src/ATen/cpu/vec/vec_base.h)显示不同宽度SLEEF与generic标准函数入口。源码只说明可能路径，未追踪本次实际微内核，不能据函数名推导本项目容差。

官方[数值准确性](https://docs.pytorch.org/docs/2.14/notes/numerical_accuracy.html)、[CE](https://docs.pytorch.org/docs/2.14/generated/torch.nn.functional.cross_entropy.html)与[log_softmax](https://docs.pytorch.org/docs/2.14/generated/torch.nn.functional.log_softmax.html)在本日核对。[LICENSE](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/LICENSE)为BSD-3-Clause-style条件；依赖各自许可仍适用。本次代码/fixture原创，无上游实现复制；本仓库公开可读不等于授予开源再分发许可。

## 实验给出的边界

本次AMD EPYC 9V74与前次Wine干预的Intel Xeon Platinum 8573C不同，原计划背景的同主机措辞已作事后更正，原计划保留。

手写16×3 dyadic logits与16标签在任何计算前固定；不用seed重新生成。A-B-B-A实际AVX512/DEFAULT切换，但14记录/465值全部严格相同；同条件重复和非干预控制通过。因此只能说这一fixture没有检测到差异，不代表所有softmax输入或训练路径不敏感。

显式softmax链是另一种算法，除法与上游可能的倒数乘法不保证逐位相同；它不是融合内核跟踪，也不是真值。完整协议、文件hash、原始结果和状态见[日报](../../daily-learning/2026-10-12/README.md)。下一步另行预声明固定真实输入/权重的一步训练边界，不在今天更换fixture寻找差异。
