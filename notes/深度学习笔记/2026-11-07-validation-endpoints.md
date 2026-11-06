# 固定预算与验证终点

完整配置、数值和工程证据见[日报](../../daily-learning/2026-11-07/README.md)。

对每个架构a、调度b和候选终点e，选择目标是三种子validation CE的算术均值；这不是挑三个种子中的最好者。候选网格在运行前冻结，所有分支跑满同一预算，因而不会因“看到验证变差”而事后获得不同训练成本。

训练集决定标准化mean/scale和梯度；验证集只参与评估和终点选择；历史test已公开，本实验不评分。验证扰动不改变权重只是数据流隔离证据，不消除研究人员重复使用验证集产生的偏差。

官方依据：[Module源码](https://github.com/pytorch/pytorch/blob/v2.14.1/torch/nn/modules/module.py)、[autograd模式](https://docs.pytorch.org/docs/2.14/notes/autograd.html)、[最佳模型快照](https://docs.pytorch.org/tutorials/beginner/saving_loading_models.html)、[交叉验证](https://scikit-learn.org/stable/modules/cross_validation.html)。PyTorch LICENSE为BSD风格及分组件声明；原创代码无上游复制。

下轮应从比较走向可交付推理产物。预先定义dtype/shape/非有限拒绝、预处理和权重绑定、版本与哈希，再检查保存前后预测一致；不能将验证选择或序列化完整性冒充未知真实数据上的模型质量。
