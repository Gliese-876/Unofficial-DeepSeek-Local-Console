# DeepSeek Local Console (Unofficial)

[English](README_EN.md) | 简体中文

一个本地运行的 DeepSeek 对话控制台。前端页面直接在浏览器中使用，后端只负责静态资源、状态持久化和 DeepSeek API 代理请求。

本项目的代码、界面和文档均完全使用 OpenAI Codex 编写。

项目重点是尽可能完整地暴露 DeepSeek 请求参数，让用户可以自定义每次提交给 API 的参数，包括许多现有平台尚未开放的 `reasoning_effort` 等新参数。

## 功能

- 本地填写 API Key 和 API 地址
- 多会话管理，可删除会话并二次确认
- 会话默认继承当前会话模型
- 支持流式输出和手动停止
- 单独展示并可折叠 `reasoning_content`
- Markdown / KaTeX 渲染
- 输入区支持类似 Obsidian 的 Markdown 即时编辑体验
- 每个会话独立保存模型、流式模式和请求参数
- 支持自定义提交给 API 的请求参数，包括 `reasoning_effort`
- 可选拉取 `/models` 模型列表

## 运行要求

- Node.js 20 或更高版本
- 可访问 DeepSeek API 的网络环境
- 一个可用的 DeepSeek API Key

## 安装

```bash
npm install
```

## 启动

```bash
npm start
```

启动后访问：

```text
http://127.0.0.1:3000/
```

如需修改端口，可以设置 `PORT` 环境变量。例如 PowerShell：

```powershell
$env:PORT = "3001"
npm start
```

然后访问：

```text
http://127.0.0.1:3001/
```

## 本地数据与安全

应用首次启动时会自动创建：

```text
data/store.json
```

这个文件保存本地会话、参数设置等状态。如果用户选择在本地保存 API Key，API Key 也会以明文保存在该文件中。

因此，发布、提交或打包源码时不要包含以下内容：

- `data/`
- `.env`、`.env.*`
- `node_modules/`
- `.git/`
- `.playwright-cli/`
- `output/`
- `*.zip`、`*.tar`、`*.tar.gz`
- 日志文件

这些路径已经写入 `.gitignore`。如果需要分享源码，请只分享仓库源码和必要的许可证文件，不要附带个人会话数据或本地压缩包。

## 重新安装依赖

仓库不包含 `node_modules/`。在新机器上拉取源码后运行：

```bash
npm install
npm start
```

## 第三方组件与许可证

本项目引用的前端库通过 npm 安装，`node_modules/` 不提交到仓库；安装依赖时会同时获取这些库自己的许可证文件。

主要依赖如下：

| 组件 | 用途 | 许可证 |
| --- | --- | --- |
| `marked` | Markdown 解析 | MIT |
| `KaTeX` | 数学公式渲染 | MIT |
| `DOMPurify` | HTML 清理 | MPL-2.0 OR Apache-2.0 |
| `Vditor` | 所见即所得 Markdown 输入 | MIT |

项目还随源码分发了字体文件：

| 字体 | 文件 | 许可证 |
| --- | --- | --- |
| 霞鹜新致宋 Plus / LXGW Neo ZhiSong Plus | `public/fonts/LXGWNeoZhiSongPlus.ttf` | IPA Font License |

字体许可证副本位于 `public/fonts/LXGWNeoZhiSong-LICENSE_CHS.md`。重新分发本项目时请保留该许可证文件，并遵守 IPA Font License 的要求。

## 项目许可证

本项目代码使用 GNU General Public License v3.0 or later 开源，详见根目录 `LICENSE`。

第三方库和字体不由本项目许可证重新授权，分别按上表列出的许可证使用与分发。
