# Changelog

> 作者：Yardon

## v1.0.0 (2026-04-28)

- 初始版本
- 整合 Markdown 渲染与中文乱码修复经验
- 支持 8 方向系统排查（SSE、编码、Markdown、性能、安全等）
- 支持 4 个前端框架适配（React / Vue / Angular / Svelte）
- 支持 3 个后端框架适配（FastAPI / Django / Flask）
- 提供完整聊天界面模板（`assets/chat_template.html`）
- 提供编码诊断脚本（`scripts/diagnose_encoding.py`）
- 渐进式加载设计：SKILL.md 决策树 + 9 个专题 references
- 8 个验证测试案例（含浏览器控制台检查代码）
- CSP 安全策略（含 connect-src SSE 必需指令）
- DOMPurify XSS 防护
- 性能优化方案（增量渲染 / rAF 节流 / 虚拟滚动）
