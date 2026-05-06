# 框架适配指南 / Framework Adaptation Guide

> 🇬🇧 EN: React/Vue 3/Angular/Svelte adapters, TypeScript types, DOMPurify hook integration.
> 🇨🇳 ZH: React/Vue 3/Angular/Svelte 四框架适配方案、TypeScript 类型定义、DOMPurify 钩子集成。


> 作者：Yardon | React / Vue / Angular / Svelte 四方适配

## TypeScript 类型定义

```typescript
// ── types/markdown.ts ──

/** 聊天消息属性 */
export interface ChatMessageProps {
  content: string;
  role?: 'user' | 'assistant' | 'system';
  timestamp?: number;
  id?: string;
}

/** SSE 流式响应 */
export interface SSEResponse {
  text: string;
  done: boolean;
  error?: string;
}

/** SSE 事件处理器 */
export interface SSEHandlers {
  onToken: (fullText: string) => void;
  onDone: (fullText: string) => void;
  onPing?: () => void;
  onError: (error: string) => void;
}

/** 工具调用输出 */
export interface ToolOutput {
  name: string;
  params: Record<string, unknown>;
  result?: unknown;
}

/** Markdown 渲染选项 */
export interface RenderOptions {
  incremental?: boolean;
  abortSignal?: AbortSignal;
  sanitize?: boolean;
}

/** 代码块元数据 */
export interface CodeBlockMeta {
  language: string;
  code: string;
  highlighted?: boolean;
}

/** 表格列配置（预留，暂未在框架示例中使用）*/
export interface TableColumn {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

/** 消息操作 */
export interface MessageActions {
  copy: (messageId: string) => Promise<void>;
  regenerate: (messageId: string) => Promise<void>;
  thumbsUp: (messageId: string) => void;
  thumbsDown: (messageId: string) => void;
}

/** 流式会话状态 */
export interface StreamingSession {
  id: string;
  abortController: AbortController;
  startTime: number;
  fullText: string;
  lastRenderedLength: number;
  thinkingTimer: ReturnType<typeof setInterval> | null;
  renderCleanup: (() => void) | null;
}

/** 暗黑模式主题（预留，chat_template.html CSS 变量模式可映射到此接口）*/
export interface ThemeConfig {
  mode: 'light' | 'dark' | 'auto';
  variables: Record<string, string>;
}

/** CDN 依赖状态（预留，与 diagnose_encoding.py --deps 标志输出结构对应）*/
export interface CDNStatus {
  marked: boolean;
  highlight: boolean;
  dompurify: boolean;
  katex: boolean;
  mermaid: boolean;
  allLoaded: boolean;
}
```

## React

### 带类型定义

```tsx
import { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';

interface ChatMessageProps {
  content: string;
  role?: 'user' | 'assistant';
}

function ChatMessage({ content, role = 'assistant' }: ChatMessageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState('');

  // 应用初始化时注册危险协议钩子（与 security.md 一致）
  useEffect(() => {
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.hasAttribute('href')) {
        const href = node.getAttribute('href')!.trim().toLowerCase();
        if (href.startsWith('javascript:') || href.startsWith('data:') ||
            href.startsWith('vbscript:')) {
          node.removeAttribute('href');
        }
      }
    });
  }, []);

  useEffect(() => {
    const raw = marked.parse(content);
    const clean = DOMPurify.sanitize(raw, {
      ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','p','br','ul','ol','li',
        'strong','em','del','a','code','pre','blockquote','table','thead',
        'tbody','tr','th','td','img','span','div','hr'],
      ALLOWED_ATTR: ['href','src','class','id','target','alt','title']
    });
    setRendered(clean);
  }, [content]);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.querySelectorAll<HTMLElement>('pre code').forEach(block => {
      hljs.highlightElement(block);
    });
  }, [rendered]);

  return <div ref={containerRef} className="prose" dangerouslySetInnerHTML={{ __html: rendered }} />;
}

// 或使用 react-markdown（推荐）
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';

function ChatMessage({ content }: ChatMessageProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight, rehypeKatex]}
    >
      {content}
    </ReactMarkdown>
  );
}
```

## Vue 3

```vue
<template>
  <div class="prose" ref="proseRef" v-html="renderedContent" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const props = defineProps<{ content: string }>();

// 注册危险协议钩子（与 security.md 一致）
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.hasAttribute('href')) {
    const href = node.getAttribute('href')!.trim().toLowerCase();
    if (href.startsWith('javascript:') || href.startsWith('data:') ||
        href.startsWith('vbscript:')) {
      node.removeAttribute('href');
    }
  }
});

const renderedContent = computed(() => {
  const raw = marked.parse(props.content);
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','p','br','ul','ol','li',
      'strong','em','del','a','code','pre','blockquote','table','thead',
      'tbody','tr','th','td','img','span','div','hr'],
    ALLOWED_ATTR: ['href','src','class','id','target','alt','title']
  });
});

// 代码高亮使用组件 ref 限定作用域，避免全局扫描
import { ref, onUpdated } from 'vue';
const proseRef = ref<HTMLDivElement>();
onUpdated(() => {
  // ✅ 使用组件 ref 而非 document.querySelectorAll 全局选择器
  proseRef.value?.querySelectorAll<HTMLElement>('pre code').forEach(block => {
    hljs.highlightElement(block);
  });
});
</script>
```

## Angular

```typescript
import { Component, Input, ElementRef, AfterViewChecked } from '@angular/core';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface ChatMessageConfig {
  sanitize: boolean;
  highlightCode: boolean;
  renderMath: boolean;
}

@Component({
  selector: 'app-chat-message',
  template: '<div class="prose" [innerHTML]="renderedContent"></div>'
})
export class ChatMessageComponent implements AfterViewChecked {
  @Input() content = '';
  @Input() config: ChatMessageConfig = {
    sanitize: true, highlightCode: true, renderMath: false
  };

  constructor(private el: ElementRef<HTMLElement>) {
    // 注册危险协议钩子（与 security.md 一致）
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.hasAttribute('href')) {
        const href = node.getAttribute('href')!.trim().toLowerCase();
        if (href.startsWith('javascript:') || href.startsWith('data:') ||
            href.startsWith('vbscript:')) {
          node.removeAttribute('href');
        }
      }
    });
  }

  // 缓存上次渲染结果，避免 Angular 变更检测在每个周期都重新计算
  private cachedContent = '';
  private renderedCache = '';

  get renderedContent(): string {
    // 仅在 content 实际变化时才重新解析（避免每次 CD 周期都调用 marked + DOMPurify）
    if (this.content === this.cachedContent) return this.renderedCache;
    this.cachedContent = this.content;
    const raw = marked.parse(this.content);
    if (this.config.sanitize) {
      this.renderedCache = DOMPurify.sanitize(raw, {
        ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','p','br','ul','ol','li',
          'strong','em','del','a','code','pre','blockquote','table','thead',
          'tbody','tr','th','td','img','span','div','hr'],
        ALLOWED_ATTR: ['href','src','class','id','target','alt','title']
      });
    } else {
      this.renderedCache = raw;
    }
    return this.renderedCache;
  }

  ngAfterViewChecked() {
    if (this.config.highlightCode) {
      this.el.nativeElement.querySelectorAll<HTMLElement>('pre code').forEach(block => {
        hljs.highlightElement(block);
      });
    }
  }
}
```

## Svelte

```svelte
<script lang="ts">
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';

  export let content = '';
  export let sanitize = true;

  // 注册危险协议钩子（与 security.md 一致）
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.hasAttribute('href')) {
      const href = node.getAttribute('href')!.trim().toLowerCase();
      if (href.startsWith('javascript:') || href.startsWith('data:') ||
          href.startsWith('vbscript:')) {
        node.removeAttribute('href');
      }
    }
  });

  $: renderedContent = sanitize
    ? DOMPurify.sanitize(marked.parse(content), {
        ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','p','br','ul','ol','li',
          'strong','em','del','a','code','pre','blockquote','table','thead',
          'tbody','tr','th','td','img','span','div','hr'],
        ALLOWED_ATTR: ['href','src','class','id','target','alt','title']
      })
    : marked.parse(content);

  function highlightCode(node: HTMLElement) {
    node.querySelectorAll('pre code').forEach(block => {
      hljs.highlightElement(block as HTMLElement);
    });
    node.querySelectorAll('.language-mermaid').forEach(block => {
      mermaid.run({ nodes: [block as HTMLElement] });
    });
  }
</script>

<div class="prose" use:highlightCode>
  {@html renderedContent}
</div>
```
