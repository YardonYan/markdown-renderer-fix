# markdown-renderer-fix

<div align="center">

[![Version](https://img.shields.io/badge/version-2.0.0-blue)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![OpenClaw Skill](https://img.shields.io/badge/OpenClaw-Skill-%237BA7A6)](https://github.com/nicepkg/openclaw)

**一站式修复大模型 SSE 流式输出中的中文乱码、Markdown 渲染异常与前端展示问题。**

</div>

<p align="center">
  <em>你的大模型回答得再好，"" 和 "锟斤拷" 也能一键毁掉所有体验。</em>
  <br>
  <em>这个 Skill 从根因出发彻底解决——8 阶段数据流全链路排查 + 开箱即用的生产级模板。</em>
</p>

---

## 📸 效果预览

> ⬇️ 以下 4 处需要替换为实际截图，文件名和尺寸建议已标注。

### 截图 1：示范画廊整体页面

| **截图尺寸** | 1200×800 px                                                  |
| :----------- | :----------------------------------------------------------- |
| **展示内容** | 6 张卡片并排的莫奈花园配色画廊，分别为：纯文本、代码高亮、表格、数学公式、Mermaid 图表、混合内容 |

![image-20260506063545321](https://gitee.com/YardonYan/imgs/raw/master/img/202605060638778.png)



### 截图 2：卡片展开后的代码高亮效果

| 截图**尺寸** | 1200×900 px                                                  |
| :----------- | :----------------------------------------------------------- |
| **展示内容** | 展开卡片内 Python 代码，带语法高亮（关键字蓝色、字符串绿色）和右上角语言标签 |

![image-20260506063900120](https://gitee.com/YardonYan/imgs/raw/master/img/202605060639226.png)



### 截图 3：Mermaid 流程图卡片展开

| **截图尺寸** | 1200×900 px                                        |
| :----------- | :------------------------------------------------- |
| **展示内容** | 展开卡片内渲染好的流程图，节点带圆角边框和箭头连线 |

![image-20260506063947081](https://gitee.com/YardonYan/imgs/raw/master/img/202605060639180.png)



## 🚀 快速开始

> 💡 **在线演示**: [GitHub Pages Demo](https://yardonyan.github.io/markdown-renderer-fix)（部署后更新链接）

```bash
# 1. 克隆到 OpenClaw 技能目录
git clone <repo-url>
cp -r markdown-renderer-fix ~/.qclaw/skills/

# 2. 本地预览（需 HTTP 服务器，不支持 file:// 直接打开）
cd markdown-renderer-fix/assets
py -m http.server 8080
# 浏览器访问 http://localhost:8080/chat_template.html

# 2. 直接在浏览器中预览效果（无需启动服务器）
open assets/demo.html      # macOS
start assets/demo.html     # Windows
xdg-open assets/demo.html  # Linux

# 3. 对你的服务器运行诊断
python scripts/diagnose_encoding.py --full
```

---

## ❓ 为什么需要这个 Skill

SSE 流式 + 中文文本 + Markdown 渲染，看似简单，实际穿越前后端 **8 个数据阶段**：

```
后端: tiktoken 解码 → Python str → json.dumps 转义 → .encode('utf-8') → HTTP 传输
前端: reader.read() → TextDecoder → JSON.parse → marked.parse()
```

**任何一个环节出错 → 全链路乱码。** 开发者往往修了一处又冒出另一处，反复排查耗时数小时。

这个 Skill 提供：
- 🔍 **决策树**：快速定位 8 个阶段中哪个环节出了问题
- 🛠️ **即用修复**：每种常见根因的复制粘贴式解决方案
- 🏭 **生产模板**：所有修复已内置的完整聊天界面
- ✅ **11 项验证**：确认修复真正生效的测试案例

---

## 🧩 这是什么

这是一个 **[OpenClaw Skill](https://github.com/nicepkg/openclaw)**——可复用的 AI 指令模块，OpenClaw 在检测到 Markdown 渲染或编码问题时自动加载。

**但 HTML 模板和 Python 脚本可完全独立使用**：

| 组件 | 说明 | 独立使用？ |
|:-----|:-----|:---------|
| `assets/chat_template.html` | 完整聊天 UI（SSE + Markdown + 高亮 + 公式） | ✅ 浏览器直接打开 |
| `assets/demo.html` | Markdown 渲染效果画廊（6 种范本卡片） | ✅ 浏览器直接打开 |
| `scripts/diagnose_encoding.py` | 多模式编码健康检查 | ✅ `python` 命令运行 |
| `SKILL.md` + `references/` | OpenClaw AI 指导 | 需 OpenClaw 环境 |

---

## 📚 文档导航

### 入口

| 文档 | 何时阅读 |
|:-----|:-----|
| [SKILL.md](SKILL.md) | 从这里开始——决策树 + 快速修复表 |
| [CHANGELOG.md](CHANGELOG.md) | 查看版本更新 |

### 看到乱码了？

| 文档 | 内容 |
|:-----|:-----|
| [encoding_fix.md](references/encoding_fix.md) | tiktoken 根因、GBK/UTF-8 混用、Tokenizer 兼容性 |
| [troubleshooting.md](references/troubleshooting.md) | 6 步逐层排查手册 |

### Markdown 渲染有问题？

| 文档 | 内容 |
|:-----|:-----|
| [markdown_render.md](references/markdown_render.md) | Marked.js 配置、渲染管道、工具调用过滤 |
| [performance.md](references/performance.md) | 增量渲染、节流优化、大文本处理 |
| [security.md](references/security.md) | XSS 防护、DOMPurify、CSP 头配置 |

### 在开发 SSE 端点？

| 文档 | 内容 |
|:-----|:-----|
| [backend_sse.md](references/backend_sse.md) | FastAPI / Django / Flask 实现、反向代理配置（6 种） |
| [frontend_sse.md](references/frontend_sse.md) | SSE 消费、超时处理、断线重连 |

### 用前端框架？

| 文档 | 内容 |
|:-----|:-----|
| [framework_adaptation.md](references/framework_adaptation.md) | React / Vue 3 / Angular / Svelte 适配方案 |

### 上线前检查

| 文档 | 内容 |
|:-----|:-----|
| [test_cases.md](references/test_cases.md) | 11 项验证测试（含 XSS 攻击、暗黑模式、移动端） |
| [accessibility.md](references/accessibility.md) | ARIA、键盘快捷键、颜色对比度 |
| [browser_support.md](references/browser_support.md) | 浏览器兼容矩阵、CDN 可用性、渐进增强策略 |

---

## 🔧 快速诊断命令

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



---

## 🤝 参与贡献

欢迎提交 Bug 报告、功能建议、PR！

- 遇到了文档未覆盖的编码场景？请提交 Issue，附带乱码文本样本
- 为其他 Tokenizer 做了适配？欢迎 PR——先查阅 [Tokenizer 兼容性表](references/encoding_fix.md)

---

## 📄 许可证

MIT © [Yardon](LICENSE)
