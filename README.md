# markdown-renderer-fix Skill

> 作者：Yardon | 基于多次实战修复经验编写

## 用途

解决 Markdown 渲染、SSE 流式输出、中文乱码、代码块高亮、数学公式、Mermaid 图表等前端展示问题。

## 文件结构

```
markdown-renderer-fix/
├── SKILL.md                    # 主技能文件（入口）
├── README.md                   # 本文件
├── CHANGELOG.md                # 版本历史
├── scripts/
│   └── diagnose_encoding.py    # 编码诊断脚本
├── references/
│   ├── backend_sse.md          # 后端 SSE 实现
│   ├── frontend_sse.md         # 前端 SSE 消费
│   ├── markdown_render.md      # Markdown 渲染
│   ├── encoding_fix.md         # 中文乱码修复
│   ├── framework_adaptation.md # 框架适配
│   ├── performance.md          # 性能优化
│   ├── security.md             # 安全提醒
│   ├── test_cases.md           # 测试案例
│   └── troubleshooting.md      # 问题排查
└── assets/
    └── chat_template.html      # 完整聊天界面模板
```

## 使用方法

### 快速诊断

```bash
python scripts/diagnose_encoding.py --full
```

### 查看决策树

打开 `SKILL.md`，根据乱码类型选择排查方向。

### 查看具体文档

- 中文乱码 → `references/encoding_fix.md`
- SSE 不流式 → `references/backend_sse.md` + `references/frontend_sse.md`
- Markdown 未渲染 → `references/markdown_render.md`
- 框架项目 → `references/framework_adaptation.md`
- 性能卡顿 → `references/performance.md`
- 安全检查 → `references/security.md`
- 修复后验证 → `references/test_cases.md`
- 复合问题 → `references/troubleshooting.md`

### 使用模板

`assets/chat_template.html` 是包含所有修复的生产级聊天界面模板，可直接复制使用。
