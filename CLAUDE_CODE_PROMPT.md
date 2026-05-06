<!--
  文件用途：demo.html 设计规格说明
  本文件描述示范页面的设计意图、配色方案和交互规范，
  供 Claude Code 或其他 AI 编码助手在修改 demo.html 时参考。
  普通用户无需阅读此文件。
-->

# Claude Code Design Spec / 设计文档：示范页面升级

> 🇬🇧 EN: Original design document for assets/demo.html — developer reference only.
> 🇨🇳 ZH: assets/demo.html 的原始设计文档，仅供开发者参考。

> 📝 **此文件为 `assets/demo.html` 的原始设计文档（Design Spec），仅供开发者参考。**
> 最终实现以 `assets/demo.html` 和 `assets/chat_template.html` 的实际代码为准。

## ⚠️ 重要约束

- **工作目录**：`D:\Study\AI_Yardon\Creation\intelligent-document-rag\skills\markdown-renderer-fix`
- **仅修改本 skill 目录内文件**，不得触碰项目其他部分（如 `intelligent-document-rag` 的其他代码）
- **不得修改 `SKILL.md` 的核心诊断逻辑和参考文档结构**
- **不得修改 `scripts/diagnose_encoding.py` 的功能逻辑**
- 可修改的文件范围：`assets/demo.html`（新增或替换）、`SKILL.md`（仅更新示范页面引用部分）、`CHANGELOG.md`（追加更新记录）、`README.md`（如有必要更新）

---

## 任务目标

将现有的聊天对话式示范模板（`assets/chat_template.html`）替换为一个**全新的、非对话形式的 Markdown 渲染效果示范页面**，让使用者能直观看到 Markdown 各种元素（标题、表格、代码、公式、图表等）的最终渲染效果。

---

## 页面设计规范

### 1. 整体布局

```
┌─────────────────────────────────┐
│         Hero 头部区域            │
│    标题 + 副标题 + Badge        │
├─────────────────────────────────┤
│  分类筛选栏（sticky 吸顶）       │
│  全部 | 文本 | 代码 | 表格 |    │
│  公式 | 图表 | 综合             │
├─────────────────────────────────┤
│                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐   │
│  │ 卡片1 │ │ 卡片2 │ │ 卡片3 │   │
│  └──────┘ └──────┘ └──────┘   │
│  ┌──────┐ ┌──────┐ ┌──────┐   │
│  │ 卡片4 │ │ 卡片5 │ │ 卡片6 │   │
│  └──────┘ └──────┘ └──────┘   │
│         ...                     │
│                                 │
├─────────────────────────────────┤
│           Footer                │
└─────────────────────────────────┘
```

- 卡片网格布局：`grid-template-columns: repeat(auto-fill, minmax(360px, 1fr))`
- 卡片之间间距：24px
- 整个页面最大宽度：1400px，居中

### 2. 配色方案（莫奈花园印象派美学）

严格按照以下色彩变量：

```css
--pond-teal: #7BA7A6;        /* 池水青绿 — 主色 */
--pond-teal-light: #9BC4C3;  /* 浅池水 */
--pond-teal-dark: #5E8E8D;   /* 深池水 */
--lotus-pink: #E8D5E0;       /* 淡粉睡莲 */
--lotus-pink-deep: #D4B8C8;  /* 深睡莲 */
--willow-green: #8FA68E;     /* 垂柳绿 */
--afternoon-gold: #F5E6D3;   /* 午后阳光 */
--shadow-blue: #6B7B8C;      /* 紫蓝阴影 */
--bridge-wood: #C4A77D;      /* 日本桥木 */
--iris-purple: #9B7CB6;      /* 鸢尾紫 */
--poppy-red: #E07A5F;        /* 罂粟红 */
--cream: #FAF7F2;            /* 背景底色 */
--paper: #F5F0EB;            /* 纸色 */
```

- Hero 区域背景：`linear-gradient(135deg, pond-teal → willow-green → shadow-blue)`
- 卡片背景：纯白 `#fff`
- 卡片边框：`rgba(123,167,166,0.1)`
- 表格表头：`linear-gradient(135deg, pond-teal → pond-teal-dark)`，白色文字
- 代码块背景：`#1e1e1e`（暗色），语言标签用 `pond-teal-light`
- blockquote 左边框颜色：`pond-teal`
- 链接颜色：`pond-teal`

### 3. 字体方案

```css
/* 通过 Google Fonts 加载 */
font-family: 'Playfair Display', 'Noto Serif SC', serif;   /* 标题 */
font-family: 'Cormorant Garamond', 'Noto Serif SC', serif; /* 正文 */
font-family: 'SFMono-Regular', Consolas, monospace;         /* 代码 */
```

### 4. 动画效果

- Hero 背景光斑缓慢漂浮：20s ease-in-out 循环的 translate + rotate
- 卡片 hover：`translateY(-5px)` + 阴影加深，过渡 0.45s cubic-bezier
- 卡片展开：grid-column 从 auto 变为 `1 / -1`（占满整行）
- 展开内容：fadeInUp 动画（opacity 0→1 + translateY 8px→0，duration 0.4s）
- 卡片顶部渐变色条 hover 时显现（3px，pond-teal → willow-green → lotus-pink-deep）
- 筛选按钮 active/hover：背景变为 pond-teal + translateY(-2px)

### 5. 卡片交互逻辑

- **收起状态**：显示 card-header（tag + 标题 + 描述）+ card-preview（渲染后的 Markdown 预览，max-height 180px，底部渐变遮罩）
- **点击卡片**：展开 → 隐藏 preview，显示 full 内容（完整 Markdown 渲染），同时收起其他已展开卡片
- **展开后**：卡片右上角显示圆形关闭按钮（✕），点击关闭按钮收起卡片
- **关闭后**：恢复初始收起状态

### 6. 分类筛选

- 顶部 sticky 筛选栏，按钮为圆角胶囊形
- 点击筛选按钮，仅显示对应分类卡片，其余 `display: none`
- 支持分类：全部(all) / 文本排版(text) / 代码展示(code) / 表格数据(table) / 数学公式(math) / 图表绘制(diagram) / 综合文档(mixed)

---

## 8 个示范卡片内容设计

### 卡片 1：文章与段落（text 分类）
- tag: "文本排版"
- 标题: "文章与段落"
- 描述: "标题层级、引用、强调、链接与分割线"
- 内容要点：h1/h2/h3 标题、粗体/斜体强调、blockquote 引用、ul/ol 列表、链接、hr 分割线
- 主题建议：春日随笔（文学性内容，展示优雅排版）

### 卡片 2：列表结构（text 分类）
- tag: "文本排版"
- 标题: "列表结构"
- 描述: "有序列表、无序列表与任务清单"
- 内容要点：task list（[x]/[ ]）、有序列表嵌套、无序列表、引用块+列表混排
- 主题建议：项目开发任务清单

### 卡片 3：代码高亮渲染（code 分类）
- tag: "代码展示"
- 标题: "代码高亮渲染"
- 描述: "Python、JavaScript、SQL、CSS 多语言语法高亮"
- 内容要点：至少 4 种语言的代码块、每个带复制按钮、语言标签
- 具体语言：Python（数据处理）、JavaScript（异步）、SQL（查询）、CSS（动画）

### 卡片 4：体育赛事成绩（table 分类）
- tag: "表格数据"
- 标题: "体育赛事成绩"
- 描述: "复杂数据表格，含多级分类与数据汇总"
- 内容要点：多个表格（男子/女子 100 米决赛、4×100 接力、班级总分排名、破纪录统计）、表格前有标题、表后有引用注释
- 主题：2024 秋季校运会成绩总览
- ⚠️ 重要：这是最能体现表格渲染能力的卡片，数据要丰富真实

### 卡片 5：数学表达式（math 分类）
- tag: "数学公式"
- 标题: "数学表达式"
- 描述: "KaTeX 行内公式与独立公式块"
- 内容要点：行内公式($...$)、独立公式块($$...$$)、多领域公式（代数、微积分、概率、线性代数、物理）、公式与文字混排
- 包含公式：二次方程求根公式、韦达定理、导数定义、定积分、正态分布、贝叶斯定理、矩阵乘法、特征值、质能方程

### 卡片 6：流程与架构图（diagram 分类）
- tag: "图表绘制"
- 标题: "流程与架构图"
- 描述: "Mermaid 流程图、时序图、甘特图与类图"
- 内容要点：4 种 Mermaid 图表类型（graph TD 流程图、sequenceDiagram 时序图、gantt 甘特图、classDiagram 类图）
- 节点使用 emoji 图标和彩色样式

### 卡片 7：API 接口文档（mixed 分类）
- tag: "综合文档"
- 标题: "API 接口文档"
- 描述: "完整技术文档，融合所有 Markdown 特性"
- 内容要点：概述表格、JSON 代码块、请求参数说明、响应示例、快速开始（Python + cURL）、版本表格
- 主题：用户管理系统 RESTful API 文档

### 卡片 8：中文排版优化（text 分类）
- tag: "文本排版"
- 标题: "中文排版优化"
- 描述: "中英文混排、标点规范、字体搭配"
- 内容要点：全角标点说明、中西混排空格规则表格、字体搭配表、数字规范表、正误对比
- 重点体现中文内容在 Markdown 渲染中的表现

---

## Markdown 内容内 CSS 样式要求

确保以下元素在 `.md-content` 容器内正确渲染：

- **h1**：Playfair Display 字体，1.7rem，600 weight，pond-teal-dark 色，底部 lotus-pink 边框
- **h2**：1.3rem，600 weight，willow-green 色
- **h3**：1.1rem，600 weight，shadow-blue 色
- **p**：text-align: justify
- **strong**：600 weight
- **em**：italic + ink-light 色
- **a**：pond-teal 色，底部细线，hover 加深
- **ul li::marker**：pond-teal 色
- **blockquote**：左边 pond-teal 4px 边框，淡 pond-teal 背景，圆角右侧
- **table**：圆角 overflow，表头渐变 pond-teal 背景白色字，交替行浅背景，hover 行高亮
- **code (inline)**：浅 shadow-blue 背景，圆角，shadow-blue 文字色
- **hr**：渐变线（透明 → lotus-pink → 透明）

---

## 依赖库（CDN 引入，保持在 HTML 内）

```
marked.js 12.0.1
highlight.js 11.9.0 (github-dark 主题)
KaTeX 0.16.9 (含 auto-render)
Mermaid 10
Google Fonts: Playfair Display, Cormorant Garamond, Noto Serif SC
```

---

## 需要修改的现有文件

### 1. `assets/demo.html`（新增）
- 完整的示范页面 HTML 文件
- 单文件包含所有 CSS/JS，无外部依赖（除 CDN）
- 所有 Markdown 内容数据以 JS 对象形式内联

### 2. `SKILL.md` 更新
- 在"完整模板"部分，将 `assets/chat_template.html` 的引用更新为：
  ```
  - [assets/chat_template.html](assets/chat_template.html) — 生产级聊天界面模板（含 SSE 流式消费）
  - [assets/demo.html](assets/demo.html) — Markdown 渲染效果示范页面（卡片式画廊）
  ```

### 3. `CHANGELOG.md` 追加
- 新增条目记录本次更新（日期、内容概要）

---

## 不做什么

- ❌ 不改 `references/` 下的任何文件
- ❌ 不改 `scripts/diagnose_encoding.py`
- ❌ 不删 `assets/chat_template.html`（保留作为生产级聊天模板）
- ❌ 不改 skill 的核心 description 和触发逻辑
- ❌ 不碰 `intelligent-document-rag` 项目其他目录
