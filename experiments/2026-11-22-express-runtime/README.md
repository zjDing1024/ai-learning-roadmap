# Express 双版本运行时真值检查

这是 RAG 版本绑定评测的独立事实核验，不运行检索、模型或 HTTP 服务。用两份固定 npm 发布包创建真实 Express 应用，只读取一个字符串设置：

| npm 发布包 | 新建应用的 `query parser` | 切换后的原实例 | 已存在的另一个实例 | 随后新建的实例 |
| --- | --- | --- | --- | --- |
| 4.21.2 | `extended` | `simple` | `extended` | `extended` |
| 5.1.0 | `simple` | `extended` | `simple` | `simple` |

这个负对照说明：即使文档中的版本完全一致，应用实例的显式配置也不是该版本的构造默认值。此实验不比较 URL 解析结果、不测试所有 Express 版本，不从两个版本推断通用规则。

## 复现

在本目录使用 Node.js 和 npm，联网获取锁定依赖。主记录采用 Node v24.22.3 / npm 11.19.1，`NODE_ENV=test`，未运行依赖安装脚本，不上传依赖。

```sh
npm ci --ignore-scripts --no-fund --no-audit
NODE_ENV=test node verify.cjs
```

[原始输出](result.json)包括包版本、实际读取值、锁文件和两份安装后的应用源码的 SHA-256。换 Node 版本时环境字段可变，事实断言不变。两个发布包里的 `lib/application.js` 均与对应 GitHub 固定提交的文件逐字节一致；这一比对是单独的来源核对，脚本本身只计算本地摘要。未复制上游源码到此仓库。

- Express 维护者：[4.21.2 构造配置](https://github.com/expressjs/express/blob/1faf228935aa0a13111f92c28ee795be64ce3f0f/lib/application.js#L69-L85) · [该版 MIT 许可证](https://github.com/expressjs/express/blob/1faf228935aa0a13111f92c28ee795be64ce3f0f/LICENSE)
- Express 维护者：[5.1.0 构造配置](https://github.com/expressjs/express/blob/cd7d4397c398a3f3ecadeaf9ef6ac1377bd414c4/lib/application.js#L90-L101) · [该版 MIT 许可证](https://github.com/expressjs/express/blob/cd7d4397c398a3f3ecadeaf9ef6ac1377bd414c4/LICENSE)
