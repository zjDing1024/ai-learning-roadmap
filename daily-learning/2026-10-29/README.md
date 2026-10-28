# AI Engineer Daily Report：2026-10-29

时区：Asia/Kuala_Lumpur。主题：独立 CPU 打乱批索引流的快照与恢复。

## 为什么做这一项

10 月 28 日已在固定数据顺序下研究累积窗口内的训练状态。本轮先处理一个更小的问题：数据顺序经过打乱后，如何在指定发出边界恢复当前 epoch 的剩余索引，并让之后的 epoch 延续同一随机流。索引流与训练状态仍分开实现，避免在没有联合验证时宣称完整训练恢复。

工程实现继续归入 [pytorch-from-zero](https://github.com/zjDing1024/pytorch-from-zero)，本仓库保存原创来源笔记、学习路线与本人自测目标；不另建重复项目。

## 本轮实现约定

- `ShuffleConfig` 固定样本数、批大小、seed、`drop_last` 与数据身份摘要；`ShuffledBatchStream` 独占一个 CPU `torch.Generator`，不以全局随机流作为采样进度。
- 初始化时生成 epoch 0 的排列。`next_batch()` 返回一个索引元组，并立即推进**已发出索引**游标；没有训练成功确认、撤回或重试协议。
- 当前可发出前缀耗尽后，继续请求应稳定抛出 `StopIteration`，不自动生成新排列。只有显式 `advance_epoch()` 才进入下一 epoch；尚未耗尽时不允许提前推进。
- `drop_last=False` 时包含不足一批的尾部；`drop_last=True` 时只发出完整批前缀，尾部有意省略。空数据或批大小超过样本数而丢弃尾批时，可以出现没有任何输出的 epoch。
- 快照保存当前完整排列、游标、epoch、配置与局部生成器状态；恢复时校验结构、版本、排列、游标、配置和完整性。恢复要求相同的完整 PyTorch 版本字符串；传入独立已知的 `expected_config` 才能将快照绑定到调用方期望的配置。数据摘要是调用方提供的身份约定，索引流没有读取真实数据来自动证明内容一致。

这些是实现与验收约定；哪些检查已经实际通过，以本轮执行记录及下一节为准。

## 实际执行与验证结果

- 本地测试与工具检查：主套件 1,062 项（267.34 秒）与三个独立套件 59 + 45 + 34 项，共 1,200 项通过，新增 96 项。干净离线、非 editable wheel 的 11 个 CLI 全通过；pip check、Ruff lint 与 109 个文件格式检查通过。本地未运行 Docker。
- 索引回放实验、跨 epoch 对照与错误状态反例：六个 seed／尾批策略组合中的 99 个新进程检查点恢复通过。游标回退反例重复发出 10 个索引，游标前移反例漏发 5 个索引；重置 RNG 的反例保持当前轮剩余序列，却改变下一轮排列。
- 独立审查及其验收范围：144 组配置、1,836 个发出切点和 3,672 次后续 epoch 对照通过；拒绝 51 种异常快照、6 种配置／身份不匹配和 8 种非法文件。还验证了快照隔离、空轮次、尾批规则、失败原子性、禁止覆盖及全局 RNG 不受影响。独立审查计数与 pytest 测试数分开记录。

测试条目、独立进程案例、配置数和索引数量分别记录，不相加为“测试总数”。本地源码、已安装 wheel、远端源码作业和实际容器执行也分别记录。

## 工程文件与复现入口

以下入口绑定本轮已核验的工程提交。

- [索引流与快照实现](https://github.com/zjDing1024/pytorch-from-zero/blob/d6da22b470d44f5299e60733b629daa4b20060b8/src/pytorch_lab/shuffle_stream.py)。
- [独立进程实验 CLI](https://github.com/zjDing1024/pytorch-from-zero/blob/d6da22b470d44f5299e60733b629daa4b20060b8/src/pytorch_lab/shuffle_stream_cli.py)。
- [自动化测试](https://github.com/zjDing1024/pytorch-from-zero/blob/d6da22b470d44f5299e60733b629daa4b20060b8/tests/test_shuffle_stream.py)。
- [工程说明与复现命令](https://github.com/zjDing1024/pytorch-from-zero/blob/d6da22b470d44f5299e60733b629daa4b20060b8/docs/shuffled-index-recovery.md)。
- [实验 JSON](https://github.com/zjDing1024/pytorch-from-zero/blob/d6da22b470d44f5299e60733b629daa4b20060b8/results/2026-10-29-shuffle-stream.json)。
- [执行验证记录](https://github.com/zjDing1024/pytorch-from-zero/blob/d6da22b470d44f5299e60733b629daa4b20060b8/results/2026-10-29-shuffle-stream-verification.md)。
- [独立审查脚本](https://github.com/zjDing1024/pytorch-from-zero/blob/d6da22b470d44f5299e60733b629daa4b20060b8/validation/verify_shuffle_stream.py)与[审查结果](https://github.com/zjDing1024/pytorch-from-zero/blob/d6da22b470d44f5299e60733b629daa4b20060b8/results/2026-10-29-shuffle-stream-independent-review.json)。

按工程说明安装后可用以下命令复现，输出路径须为尚不存在的新文件。

```bash
python -m pytorch_lab.shuffle_stream_cli --output results/local-shuffle-stream.json
```

复现需要固定工程提交、配置与运行时；查看代码或运行帮助命令不等于完成恢复实验。没有执行 GPU 或分布式测试，不把 CPU 索引一致性写成跨设备保证。

## 来源研究与技术理解

研究项目为 [TorchData](https://github.com/meta-pytorch/data)。其 StatefulDataLoader 将读取进度作为显式可保存状态，适合当前阶段理解数据流恢复的责任边界。本轮阅读 [0.11 官方说明](https://meta-pytorch.org/data/0.11/torchdata.stateful_dataloader.html)和固定版本的 [sampler.py](https://github.com/meta-pytorch/data/blob/377e64c1be69a9be6649d14c9e3664070323e464/torchdata/stateful_dataloader/sampler.py)，没有引入 TorchData 运行时依赖。

官方采样器的所读路径保留较早的生成器状态与已发出计数，加载时重建并走到对应位置。本项目选择显式保存当前排列、当前发出游标和生成器后续状态，便于直接检查本轮与下一轮所需信息。两种状态表示并不相同；本项目不承诺复刻官方 `RandomSampler` 的每次随机调用或输出序列。完整推导、取舍与来源许可见[原创学习笔记](../../notes/深度学习笔记/2026-10-29-shuffled-index-recovery.md)。

## GitHub 交付

- 工程精确提交：[d6da22b](https://github.com/zjDing1024/pytorch-from-zero/commit/d6da22b470d44f5299e60733b629daa4b20060b8)。
- 该精确提交的 CI：[本次运行](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/40725945267)。
- CI 状态、实际作业覆盖与 artifact：成功。source 作业通过 1,062 + 59 + 45 + 34 = 1,200 项测试、11 个 CLI、Ruff lint 与 109 个文件格式检查；实际 Docker 作业的 11 个 CLI 通过，容器没有执行完整测试套件。源码 artifact 已核对 99 个恢复案例及独立审查结果，两路 artifact ZIP 摘要与 GitHub 一致。source 作业耗时 7 分 42 秒，Docker 作业 3 分 17 秒；这是运行记录，不作为性能比较。
- 本日报所属成长仓库提交以 Git 历史为准，不预填自己的未来 SHA。

本次按工程提交核对了 CI 日志与产物。远端 source 使用 Python 3.12.15，本地及容器使用 3.12.14；上述恢复测试分别在各自运行环境内完成，没有验证跨环境快照交换。历史科学结果继续按原验证范围解释。

## 求职价值与本人待自测

本项材料可展示状态建模、随机性隔离、边界测试和可复查恢复实验，不能展示尚未运行的训练精度、吞吐提升或生产级数据加载能力。助理完成的工程产物与学习者本人能力分开记录，阶段继续保持 1。

本人待自测：给定一个排列和游标，手算下一批；解释只恢复 seed 为什么可能回到错误位置；构造本轮剩余序列相同但下一轮不同的错误状态；分别说明 `drop_last` 的预期省略与恢复错误漏样；在索引已返回而反向传播未完成时，指出还需要哪些训练状态与一致性约定。完成独立解释、实现和反例记录前，不标记“已掌握”。

## 不足与下一步

- 本轮对象是固定长度数据身份下的无放回索引排列，未读取数据、执行随机变换或更新模型。`next_batch()` 返回即计为发出，已发出不等于已训练。
- 没有任意 DataLoader、worker、预取队列、并发消费者或 DDP 的恢复实现；也不承诺跨 PyTorch 版本、设备或平台的随机序列一致。
- 快照格式和摘要检查帮助发现约定不一致或意外损坏，不提供来源认证，也不承诺处理任意恶意或超大文件。
- 明日工程计划：在单进程固定模型条件下设计索引流与累积训练器的联合快照，明确读取批次、完成反向传播和提交进度的边界，并加入“索引已发出但训练未完成”的故障注入。先验证恢复后的样本与模型轨迹一致，再考虑更复杂的数据加载。此项尚未实现；本人自测仍需单独完成。
