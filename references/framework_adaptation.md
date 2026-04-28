# 框架适配指南

> 作者：Yardon | React / Vue / Angular / Svelte 四方适配

## React

```jsx
import { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';

function ChatMessage({ content }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Markdown → HTML
    const raw = marked.parse(content);
    const clean = DOMPurify.sanitize(raw);

    containerRef.current.innerHTML = clean;

    // 代码高亮
    containerRef.current.querySelectorAll('pre code').forEach(block => {
      hljs.highlightElement(block);
    });
  }, [content]);

  return <div ref={containerRef} className="prose" />;
}

// 或使用 react-markdown（推荐）
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';

function ChatMessage({ content }) {
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
  <div class="prose" v-html="renderedContent" />
</template>

<script setup>
import { computed } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const props = defineProps({ content: String });

const renderedContent = computed(() => {
  const raw = marked.parse(props.content);
  return DOMPurify.sanitize(raw);
});

// 代码高亮在 onUpdated 中
import { onUpdated } from 'vue';
onUpdated(() => {
  document.querySelectorAll('.prose pre code').forEach(block => {
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

@Component({
  selector: 'app-chat-message',
  template: '<div class="prose" [innerHTML]="renderedContent"></div>'
})
export class ChatMessageComponent implements AfterViewChecked {
  @Input() content = '';
  private lastContent = '';

  constructor(private el: ElementRef) {}

  get renderedContent(): string {
    this.lastContent = this.content;
    return DOMPurify.sanitize(marked.parse(this.content));
  }

  ngAfterViewChecked() {
    this.el.nativeElement.querySelectorAll('pre code').forEach((block: HTMLElement) => {
      hljs.highlightElement(block);
    });
  }
}
```

## Svelte

```svelte
<script>
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';
  export let content = '';

  $: renderedContent = DOMPurify.sanitize(marked.parse(content));

  function highlightCode(node) {
    node.querySelectorAll('pre code').forEach(block => {
      hljs.highlightElement(block);
    });
    // Mermaid
    node.querySelectorAll('.language-mermaid').forEach(block => {
      mermaid.run({ nodes: [block] });
    });
  }
</script>

<div class="prose" use:highlightCode>
  {@html renderedContent}
</div>
```
