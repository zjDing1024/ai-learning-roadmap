# 排序前的证据检查与算子级分配归因

## Apache Lucene：筛选条件不是相关性信号

- 维护方：Apache Software Foundation 与 Lucene contributors。[项目](https://github.com/apache/lucene) · [10.3.1 Apache-2.0 许可](https://github.com/apache/lucene/blob/releases/lucene/10.3.1/LICENSE.txt)。
- 阅读 [BooleanClause](https://github.com/apache/lucene/blob/releases/lucene/10.3.1/lucene/core/src/java/org/apache/lucene/search/BooleanClause.java) 与 [BooleanWeight 构造逻辑](https://github.com/apache/lucene/blob/releases/lucene/10.3.1/lucene/core/src/java/org/apache/lucene/search/BooleanWeight.java#L44-L56)：必需但不参与打分的子句不要求构建打分能力。由此借鉴把「是否有资格入选」与「这些候选怎么排序」写成两个可以独立验证的合同。
- 项目要额外处理的情形：零查询词重叠的记录不会有 BM25 排名，却可能持有相同版本内的矛盾值；只看 top-k 或已装入提示的内容无法得出完整范围结论。先检查索引持有、固定范围、类型明确的声明，再对候选排序。相同值不证明来源独立，缺记录不能当作一致，跨版本不同值也不自动构成冲突。未移植 Lucene 源码或引入 Java 依赖。

## PyTorch：分清参数复制、拼接分配与进程峰值

- 维护方：PyTorch 项目与贡献者。[项目](https://github.com/pytorch/pytorch) · [v2.14.1 BSD 风格许可](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/LICENSE)。
- [v2.14.1 Parameter 实现](https://github.com/pytorch/pytorch/blob/5c4886908584029761b579af026dcfb627c84070/torch/nn/parameter.py)：深复制会克隆参数张量，已有复制对象由 memo 复用。内存事件可落在 clone 的分配子算子；不要同时把父事件与子事件的包含值计入总和。
- [Profiler 官方说明](https://docs.pytorch.org/docs/2.14/profiler.html)：用命名作用域给 CPU 内存事件归因，并关闭可能延长张量引用的形状追踪。先靠小控制核对事件与字节，之后才读模型结果，把输出序列拼接与 K/V 拼接区分开。引用版本用于解释设计，运行环境版本由实验记录说明。
- 累计输出字节不是实际 DRAM 读写、瞬时驻留或进程 RSS；缓存旧引用和替换张量还可能短时共存。不用带探针的程序评估速度收益。

两个项目仅借鉴可检验的设计原则。本笔记无复制第三方实现。
