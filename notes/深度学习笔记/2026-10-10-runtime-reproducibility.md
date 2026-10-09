# 运行时复现不是一个开关

2026-10-10；助理完成源码研究与工程验证，个人理解待独立自测。

## 为什么研究pip

[PyPA pip](https://github.com/pypa/pip/tree/01857ef79f59a98db592bacb6e7b48f354528c80)解决包发现、解析、构建与安装。固定25.1.1历史源码（MIT）只为定位阅读证据，实际执行pip25.0.1另行记录，不推荐据此降级工具。阅读[hashes.py](https://github.com/pypa/pip/blob/01857ef79f59a98db592bacb6e7b48f354528c80/src/pip/_internal/utils/hashes.py)与[wheel.py](https://github.com/pypa/pip/blob/01857ef79f59a98db592bacb6e7b48f354528c80/src/pip/_internal/commands/wheel.py)：哈希allow-list和失败分支、获取和构建分层。结合[functional/test_hash.py](https://github.com/pypa/pip/blob/01857ef79f59a98db592bacb6e7b48f354528c80/tests/functional/test_hash.py)设计真实CLI损坏/缺失产物负对照。

[pip官方安全安装](https://pip.pypa.io/en/stable/topics/secure-installs/)要求hash模式覆盖所有依赖并固定版本；[重复安装指南](https://pip.pypa.io/en/stable/topics/repeatable-installs/)解释wheelhouse与平台边界。哈希固定依赖字节，不证明安全无漏洞、来源签名、自产wheel可重复构建或模型跨平台逐位相同。

## 三个不同隔离层

- `--no-index`停止索引搜索，但直接HTTP URL仍可能联网。本次runtime lock为name/version/hash，find-links仅指向本地wheelhouse。
- `python -I`排除当前目录、PYTHONPATH和用户site；系统site中editable `.pth`仍会生效，所以wheel checker额外检查安装元数据与导入位置。
- Docker `RUN --network=none`和运行时`--network none`才约束该阶段网络。前置镜像拉取/依赖获取依然需要网络。

[Python Official Image固定源码](https://github.com/docker-library/python/blob/688a0b86bb44289df16a363e9f41d90514c1a5f9/3.12/slim-bookworm/Dockerfile)由Docker Community维护（仓库MIT），展示版本/来源校验、模板生成及构建依赖清理。本次Dockerfile原创，采用获取/运行分层和非root配置。查询registry manifest只证明对应元数据存在，不能当作容器执行记录；固定digest也要求后续主动安全更新。

## 计量与进程治理

[Python perf_counter/process_time](https://docs.python.org/3.12/library/time.html)区分经过时间与本进程CPU时间；[Linux getrusage](https://man7.org/linux/man-pages/man2/getrusage.2.html)规定ru_maxrss为KiB高水位。训练起止之差可计wall/CPU，但不能用两次高水位之差当作训练内存分配。fresh interpreter不等于冷缓存；PyTorch在工作区间内懒加载仍会计时。

本次固定Wine协议source/wheel各3次，科学输出与前日一致；环境额外包和宿主负载不同，不将计时/RSS差别解读为优化收益。[PyTorch官方复现边界](https://docs.pytorch.org/docs/main/notes/randomness.html)也不保证跨版本/平台完全确定。

独立审查发现外层CLI超时只杀父进程会留下runtime worker。修复用Linux独立进程组，在timeout时终止整个组并回收直接子进程；真实子/孙进程测试证明无继续运行的后代。这个缺陷比增加漂亮的性能数字更值得记录。

[完整工程协议](https://github.com/zjDing1024/pytorch-from-zero/blob/main/docs/runtime-reproducibility.md)与[当日日报](../../daily-learning/2026-10-10/README.md)保留实现、命令、实际结果和未验证边界。没有复制上游实现，数据许可继续沿用前日署名。


## 发布后的真实边界

[修复后工程e162eaf](https://github.com/zjDing1024/pytorch-from-zero/commit/e162eafd654e44bfea3473c391491fa071b443d0)的[CPU checks #37959687015](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/37959687015)，以及4份Markdown补记后的[最终工程17aed9e](https://github.com/zjDing1024/pytorch-from-zero/commit/17aed9e5ea934807477652cabbc35a4de8c86a7e)的[CPU checks #37961087696](https://github.com/zjDing1024/pytorch-from-zero/actions/runs/37961087696)均已成功。两次精确SHA的source job通过784项测试、Ruff/格式和6条CLI，container job真实完成Docker构建及非root/只读/断网的6条已安装wheel CLI。

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

工程还暴露了一个验证缺口：Python测试不能发现YAML plain scalar内冒号空格导致的工作流解析错误。修复只改block scalar，补用actionlint、YAML解析及每个shell块的bash -n验证，并保留原错误的负对照。
