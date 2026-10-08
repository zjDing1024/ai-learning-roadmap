# 真实数据的来源、损失与评估边界

2026-10-09，阶段1；源码阅读与工程验证由助理执行，个人理解待自测。

## 为什么研究scikit-learn

[scikit-learn](https://github.com/scikit-learn/scikit-learn)的价值是把数据、拟合、变换、选择和指标分清。阅读范围为固定提交e316dbeeebfd8f38cf293d6443ce81aaa33686d3的[CSV辅助函数/load_wine](https://github.com/scikit-learn/scikit-learn/blob/e316dbeeebfd8f38cf293d6443ce81aaa33686d3/sklearn/datasets/_base.py#L325)，及官方[泄漏指导](https://scikit-learn.org/stable/common_pitfalls.html#data-leakage)和[交叉验证说明](https://scikit-learn.org/stable/modules/cross_validation.html)。没有复制实现或增加运行依赖。

本次自写轻量PyTorch实现：划分先于拟合；只在训练数据估计均值和方差；验证选架构；所有候选选完后才评估测试。精确的行ID和CSV哈希随包保存，使不同种子的模型面对相同数据。

## 数据不是原创代码

[UCI Wine](https://archive.ics.uci.edu/dataset/109/wine)为178条化学分析，不是Wine Quality。按UCI的[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)记录Aeberhard和Forina (1992)及[DOI](https://doi.org/10.24432/C5PC7J)。实际CSV从[官方固定提交](https://github.com/scikit-learn/scikit-learn/blob/e316dbeeebfd8f38cf293d6443ce81aaa33686d3/sklearn/datasets/data/wine_data.csv)原字节保存；说明上游添加首行、移动目标列和改为0/1/2编码。上游BSD通知另外保留。署名冲突时依据UCI当前引用及原始wine.names，而非复制相互矛盾的上游文档。

## CrossEntropyLoss

[官方契约](https://docs.pytorch.org/docs/stable/generated/torch.nn.CrossEntropyLoss.html)要求本例输入原始[N,3] logits和[N] int64类别。单样本损失为logsumexp减真实类logit，数值上避免先算指数再取对数。softmax在输出概率时使用，不提前传给交叉熵。辅助阅读[PyTorch v2.5.1固定源码](https://github.com/pytorch/pytorch/blob/a8d6afb511a69687bbb2b7e88a3cf67917e1697e/torch/nn/modules/loss.py#L1144-L1299)只用于理解Python层契约，实际运行版本2.14.1+cpu另行记录。

## 一个有用的反例

本次两个候选验证准确率均100%，MLP验证CE更低，按预声明规则选中。最终测试线性均97.14%、MLP均96.19%。不事后改成“验证选线性”，也不修改测试样本或继续调参。完整原始概率和错误行ID表明，MLP对共同误判样本更自信，因此CE更差。这是小数据评估不确定性的实例，不是模型普遍优劣证据。

详细设计、数据卡、命令和局限见[工程协议](https://github.com/zjDing1024/pytorch-from-zero/blob/main/docs/wine-evaluation.md)。
