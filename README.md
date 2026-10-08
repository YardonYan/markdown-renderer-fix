<div align="center">

<img src="assets/hero.png" alt="markdown-renderer-fix — 一站式修复中文乱码与 Markdown 渲染问题" width="100%">

**一站式修复大模型 SSE 流式输出中的中文乱码、Markdown 渲染异常与前端展示问题**

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-3.0.0-green.svg)](CHANGELOG.md)
[![Stars](https://img.shields.io/github/stars/YardonYan/markdown-renderer-fix?style=social)](https://github.com/YardonYan/markdown-renderer-fix)
[![平台](https://img.shields.io/badge/平台-OpenClaw%20·%20Claude%20Code%20·%20Cursor-orange.svg)](#快速开始)
[![演示](https://img.shields.io/badge/在线演示-GitHub%20Pages-4a90d9.svg)](https://yardonyan.github.io/markdown-renderer-fix/)
[![依赖](https://img.shields.io/badge/依赖-仅标准库-brightgreen.svg)](#快速诊断命令)

**中文** · [English](README.en.md)

</div>

---

> 你的大模型回答得再好，一个「锟斤拷」也能毁掉所有体验。这个 Skill 从根因出发彻底解决——全链路阶段排查 + 开箱即用的生产级模板。

## 目录

- [为什么需要这个 Skill](#为什么需要这个-skill)
- [效果预览](#效果预览)
- [这是什么](#这是什么)
- [快速开始](#快速开始)
- [使用途径](#使用途径)
- [快速诊断命令](#快速诊断命令)
- [文档导航](#文档导航)
- [版本亮点](#版本亮点)
- [文件结构](#文件结构)
- [排错](#排错)
- [贡献](#贡献)
- [许可证](#许可证)

---

<a id="为什么需要"></a>

## 为什么需要这个 Skill

SSE 流式 + 中文文本 + Markdown 渲染，看着简单，实际要穿过前后端 **8 个数据阶段**：

<img src="assets/stages.png" alt="从 token 到页面穿过的 8 个数据阶段，高亮环节为常见出错点" width="100%">

**任何一个环节出错，都会污染整条链路。** 开发者常常修完一处又冒出另一处，光排查就要耗掉几个小时。

这个 Skill 提供四样东西：

- **决策树**——快速定位 8 个阶段中究竟哪一环出了问题
- **即用修复**——每种常见根因的复制粘贴式解决方案
- **生产模板**——所有修复已内置的完整聊天界面
- **11 项验证**——确认修复真正生效的测试用例

---

## 效果预览

### 示范画廊整体页面

六张卡片并排的莫奈花园配色画廊，分别覆盖纯文本、代码高亮、表格、数学公式、Mermaid 图表与混合内容。

<img src="https://gitee.com/YardonYan/imgs/raw/master/img/202605060638778.png" alt="Markdown 渲染示范画廊，6 张卡片覆盖纯文本、代码、表格、公式、Mermaid 与混合内容" width="100%">

### 卡片展开后的代码高亮

展开卡片内的 Python 代码，关键字蓝色、字符串绿色，右上角带语言标签。

<img src="https://gitee.com/YardonYan/imgs/raw/master/img/202605060639226.png" alt="卡片展开后的代码语法高亮效果" width="100%">

### Mermaid 流程图渲染

展开卡片内渲染好的流程图，节点带圆角边框和箭头连线。

<img src="https://gitee.com/YardonYan/imgs/raw/master/img/202605060639180.png" alt="卡片展开后的 Mermaid 流程图渲染效果" width="100%">

---

<a id="这是什么"></a>

## 这是什么

这是一个 **AI Skill**——可复用的 AI 指令模块，OpenClaw 在检测到 Markdown 渲染或编码问题时自动加载。

**但 HTML 模板和 Python 脚本可以完全独立使用**：

| 组件 | 说明 | 能否独立使用 |
|:-----|:-----|:---------|
| `assets/chat_template.html` | 完整聊天 UI（SSE + Markdown + 高亮 + 公式） | 可以，需本地 HTTP 服务器 |
| `assets/index.html` | Markdown 渲染效果画廊（8 种范本卡片） | 可以，浏览器直接打开 |
| `scripts/diagnose_encoding.py` | 多模式编码健康检查 | 可以，`python` 命令运行 |
| `SKILL.md` + `references/` | AI 指导文档 | 需 OpenClaw 环境 |

<a id="快速开始"></a>

## 快速开始

> 在线演示：[GitHub Pages Demo](https://yardonyan.github.io/markdown-renderer-fix/)

### 用安装器（推荐）

仓库自带一个零依赖的安装脚本，装到本机各个 AI 应用的 skills 目录：

```bash
node tools/install.mjs --list                 # 看有哪些目标可选
node tools/install.mjs --ai workbuddy         # 装到 WorkBuddy
node tools/install.mjs --ai all               # 装到全部目标
node tools/install.mjs --ai all --dry-run     # 只预览，不写文件
```

已核对存在的目标：WorkBuddy、TRAE 国内版、CodeBuddy、Claude Code、Codex CLI、OpenClaw、Qwen Code、cc-switch。

### 作为插件安装（WorkBuddy / CodeBuddy / Claude Code）

仓库根目录带 `.codebuddy-plugin/` 与 `.claude-plugin/` 两份清单，可以直接注册成一个「单插件市场」，在应用里按插件方式安装，不用手工拷目录。

清单的字段名与取值是照着应用自带的插件清单写的，不是自己发明的格式。**文件格式已逐字段对照应用自带的市场核对；注册与加载的端到端流程未做验证**，注册入口以你所装版本的界面为准。

改过 `SKILL.md` 的 name 或版本号之后重新生成：

```bash
node tools/build_plugins.mjs .
```

### 手工使用

```bash
# 1. 克隆
git clone https://github.com/YardonYan/markdown-renderer-fix.git

# 2. 本地预览 chat_template.html（需 HTTP 服务器，不支持 file:// 直接打开）
cd markdown-renderer-fix/assets
py -m http.server 8080
# 浏览器访问 http://localhost:8080/chat_template.html

# 3. 直接预览示范画廊（无需服务器）
open assets/index.html      # macOS
start assets/index.html     # Windows
xdg-open assets/index.html  # Linux

# 4. 对你的服务器跑一次诊断
python scripts/diagnose_encoding.py --full
```

<a id="快速诊断命令"></a>

## 使用途径

使用方式取决于你用哪个 AI 助手。同一台机器上装到多个助手是允许的，互相不冲突。

### 一条命令装到任意助手

仓库自带零依赖安装器，不用手工拷贝目录：

```bash
git clone https://github.com/YardonYan/markdown-renderer-fix.git
cd markdown-renderer-fix
node tools/install.mjs --list          # 看本机有哪些目标可选
node tools/install.mjs --ai workbuddy  # 装到某一个
node tools/install.mjs --ai all        # 一次装到全部
```

### 各助手对应的目录

| 目标 id | 助手 | 全局目录 | 项目内目录 |
| --- | --- | --- | --- |
| `workbuddy` | WorkBuddy | `~/.workbuddy/skills` | `.workbuddy/skills` |
| `trae-cn` | TRAE 国内版 | `~/.trae-cn/skills` | `.trae-cn/skills` |
| `codebuddy` | CodeBuddy | `~/.codebuddy/skills` | `.codebuddy/skills` |
| `claude` | Claude Code | `~/.claude/skills` | `.claude/skills` |
| `codex` | Codex CLI | `~/.codex/skills` | `.codex/skills` |
| `openclaw` | OpenClaw | `~/.openclaw/workspace/skills` | `.openclaw/skills` |
| `qwen` | Qwen Code | `~/.qwen/skills` | `.qwen/skills` |
| `cc-switch` | cc-switch | `~/.cc-switch/skills` | `.cc-switch/skills` |
| `cursor` | Cursor | `~/.cursor/skills` | `.cursor/skills` |
| `agents` | 通用 Agent 标准 | `~/.agents/skills` | `.agents/skills` |

不加参数装全局目录（所有项目可用），加 `--project` 装当前项目的相对目录（适合随项目提交、团队共享）。

### 作为插件安装

仓库根目录带三套插件清单，可以直接被支持插件市场的助手装走，不需要手工拷目录：

| 助手 | 清单位置 | 装法 |
| --- | --- | --- |
| Claude Code | `.claude-plugin/` | `/plugin marketplace add YardonYan/markdown-renderer-fix` 后 `/plugin install markdown-renderer-fix@YardonYan-markdown-renderer-fix` |
| WorkBuddy / CodeBuddy | `.codebuddy-plugin/` | 在插件管理的市场设置里添加本仓库路径或地址 |
| Codex | `.codex-plugin/` | 按 Codex 的插件安装流程指向本仓库 |
| Cursor | `.cursor-plugin/` | `/add-plugin` 或在插件市场里搜索 |

清单的字段名与取值是照着各助手自带的插件清单写的，不是自己发明的格式。**清单文件已逐字段对照核对；插件市场的注册与加载端到端流程未做验证**，入口以你所装版本的界面为准。

### 不适用这些场景

有几种环境问了但没有对应机制，说明如下，免得白折腾：

| 场景 | 情况 |
| --- | --- |
| 网页 IDE（CodeSandbox、StackBlitz、Replit） | 技能是给 AI 助手读的指令文件，不是可运行的应用，这些环境没有对应的加载入口 |
| 云主机 / 云 Shell（Google Cloud Shell、AWS CloudShell） | 同上。如果只是想跑仓库里的脚本，直接 `git clone` 后照文档执行命令即可，跟技能加载是两回事 |
| 把仓库 ZIP 直接上传到助手的技能上传框 | 仓库含参考资料与脚本，文件数可能超限；改用安装器或插件市场更稳 |
| 手机上使用 | 上述助手基本没有移动端 |

---

## 快速诊断命令

```bash
# 全面扫描（环境 + tiktoken + 框架 + CDN + 实时 SSE 测试）
python scripts/diagnose_encoding.py --full

# 测试实际 SSE 端点
python scripts/diagnose_encoding.py --real-sse --endpoint http://127.0.0.1:18765/api/chat/stream

# 检查 CDN 依赖是否可达
python scripts/diagnose_encoding.py --deps

# 指定中文测试文本
python scripts/diagnose_encoding.py --test-text "你好世界" --full
```

<a id="文档导航"></a>

## 文档导航

### 入口

| 文档 | 何时阅读 |
|:-----|:-----|
| [SKILL.md](SKILL.md) | 从这里开始——决策树 + 快速修复表 |
| [CHANGELOG.md](CHANGELOG.md) | 查看版本更新 |

### 看到乱码了

| 文档 | 内容 |
|:-----|:-----|
| [encoding_fix.md](references/encoding_fix.md) | tiktoken 根因、GBK/UTF-8 混用、Tokenizer 兼容性 |
| [troubleshooting.md](references/troubleshooting.md) | 六步逐层排查手册 |

### Markdown 渲染有问题

| 文档 | 内容 |
|:-----|:-----|
| [markdown_render.md](references/markdown_render.md) | Marked.js 配置、渲染管道、工具调用过滤 |
| [performance.md](references/performance.md) | 增量渲染、节流优化、大文本处理 |
| [security.md](references/security.md) | XSS 防护、DOMPurify、CSP 头配置 |

### 在开发 SSE 端点

| 文档 | 内容 |
|:-----|:-----|
| [backend_sse.md](references/backend_sse.md) | FastAPI / Django / Flask 实现、六种反向代理配置 |
| [frontend_sse.md](references/frontend_sse.md) | SSE 消费、超时处理、断线重连 |

### 用前端框架

| 文档 | 内容 |
|:-----|:-----|
| [framework_adaptation.md](references/framework_adaptation.md) | React / Vue 3 / Angular / Svelte 适配方案 |

### 上线前检查

| 文档 | 内容 |
|:-----|:-----|
| [test_cases.md](references/test_cases.md) | 11 项验证测试（含 XSS 攻击、暗黑模式、移动端） |
| [accessibility.md](references/accessibility.md) | ARIA、键盘快捷键、颜色对比度 |
| [browser_support.md](references/browser_support.md) | 浏览器兼容矩阵、CDN 可用性、渐进增强策略 |

<a id="版本亮点"></a>

## 版本亮点

### v3.0.0

| 更新项 | 说明 |
|:-------|:-----|
| 修复模式目录 | 8 个编号模式（A–H），统一为「现象 → 根因 → 修复 → 参考」四段式；新增日文（平假名/片假名）与韩文（谚文）编码场景 |
| 设计系统升级 | 六色令牌体系（`--bg`、`--surface`、`--fg`、`--muted`、`--border`、`--accent`）+ 三级字体（展示衬线 / 正文无衬线 / 等宽）+ 间距阶 |
| 质量保障框架 | P0（必须通过）/ P1（应当通过）/ P2（建议通过）三级检查清单，覆盖字符集、安全、可访问性与性能 |
| 反模式文档 | 8 个常见错误及其具体替代做法，全部来自真实排查经验 |
| 视觉打磨 | `index.html` 卡片画廊与 `chat_template.html` 排版节奏、暗黑模式同步优化 |
| Open Design 整合 | 增加 `od:` frontmatter 元数据块，便于技能发现与分类 |

### 历史版本

见 [CHANGELOG.md](CHANGELOG.md)。

---

## 文件结构

```
markdown-renderer-fix/
├── SKILL.md                      # 核心技能指令：决策树 + 快速修复表
├── .codebuddy-plugin/              插件清单（WorkBuddy / CodeBuddy）
├── .codex-plugin/                  插件清单（Codex）
├── .cursor-plugin/                 插件清单（Cursor）
├── .claude-plugin/                 插件清单（Claude Code）
├── README.md                     # 中文说明（本文件）
├── README.en.md                  # English README
├── CHANGELOG.md                  # 版本历史
├── LICENSE                       # Apache-2.0 许可证
├── index.html                    # GitHub Pages 入口，跳转到示范画廊
├── assets/
│   ├── hero.png                  # README 门面图
│   ├── stages.png                # 8 阶段数据链路图
│   ├── chat_template.html        # 生产级聊天 UI 模板
│   └── index.html                # Markdown 渲染效果画廊
├── references/                   # 11 篇专题文档
│   ├── encoding_fix.md
│   ├── markdown_render.md
│   ├── backend_sse.md
│   └── ...
├── scripts/
│   └── diagnose_encoding.py      # 编码健康检查脚本
└── tools/
│  ├── gen_readme_images.py      # 生成 README 配图（Pillow）
│  └── build_plugins.mjs       生成插件清单
```

## 排错

### 装好了但对话里没反应

按顺序查三件事：

一、**`SKILL.md` 是否在技能目录的根层。** 正确结构是 `<应用技能目录>/markdown-renderer-fix/SKILL.md`。如果多套了一层目录，应用扫不到。

二、**重启应用。** 多数应用只在启动时扫描技能目录。

三、**确认目录是该应用真正会扫的那个。** 跑 `node tools/install.mjs --list` 看清单。

### 诊断输出 `⚠️ tiktoken 未安装，跳过`

正常，不是错误。这一项只检查 tokenizer 层面的字符往返，缺 `tiktoken` 时脚本跳过它、继续跑其余检查。需要这项结论再装：

```bash
pip install tiktoken
```

其余检查（编码环境、`json.dumps` 往返、SSE 链路）不依赖任何第三方库。

### `--deps` 报 `⚠️ HEAD 不可达` 但后面又写着 `GET ✅ HTTP 200`

不是故障。部分 CDN 拒绝 HEAD 请求、只允许 GET，脚本探测时先试 HEAD 失败就会打这条提示，紧接着用 GET 复测通过。只要看到 `GET ✅ HTTP 200`，这个依赖就是可达的。

### 直接双击 `chat_template.html` 打开是空白

它必须通过 HTTP 服务器访问，`file://` 协议下会被浏览器的跨域策略拦住。用：

```bash
cd assets
py -m http.server 8080
# 然后访问 http://localhost:8080/chat_template.html
```

只是想看渲染效果的话，`assets/index.html` 可以直接双击打开，它没有这个限制。

### 文档里的脚本路径和我实际装的位置不一样

文档里写的是 `.claude/skills/`，因为你用的是 Claude Code。换别的应用要换前缀：

| 应用 | 路径前缀 |
|------|----------|
| Claude Code | `.claude/skills/` |
| Continue | `.continue/skills/` |
| Droid (Factory) | `.factory/skills/` |
| ZCode | `.zcode/skills/` |
| 通用 | `.agents/skills/` |

不确定装到哪了，跑 `node tools/install.mjs --list` 看全局目录。

### 按文档改完还是有乱码

乱码可能出现在 8 个阶段的任何一环，改错地方就不会有效果。按链路顺序定位：先跑 `--full` 看哪一项失败，再对照 `references/troubleshooting.md` 的六步逐层排查手册，不要跳着改。

---

<a id="贡献"></a>

## 贡献

欢迎提交 Bug 报告、功能建议和 PR。

- 遇到文档未覆盖的编码场景？请提交 Issue，并附上乱码文本样本
- 为其他 Tokenizer 做了适配？欢迎 PR，先查阅 [Tokenizer 兼容性表](references/encoding_fix.md)

<a id="许可证"></a>

## 许可证

**Apache-2.0** —— 自由使用、修改、分发，需保留署名与协议声明。完整条款见 [LICENSE](LICENSE)。

Copyright 2026 YardonYan
