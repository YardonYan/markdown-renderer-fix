# Changelog / 更新日志

All notable changes to the markdown-renderer-fix Skill.
markdown-renderer-fix Skill 的所有重要变更。

## v2.0.0 (2026-05-06) — 首次公开发布 🎉 / First Public Release 🎉

### Core Features
- **SKILL.md**: 14-direction decision tree for Markdown + SSE + encoding diagnosis
- **assets/chat_template.html**: Production-grade chat UI template with SSE streaming, Markdown rendering, code highlighting, KaTeX math, Mermaid diagrams
- **assets/demo.html**: Card-based gallery showcasing all Markdown rendering features (text, code, tables, math, diagrams, mixed content)
- **scripts/diagnose_encoding.py**: Multi-mode encoding diagnostic script (`--full`, `--real-sse`, `--deps`, `--framework`)

### Security
- DOMPurify XSS sanitization on all Markdown output
- Dangerous protocol filtering (`javascript:`, `data:`, `vbscript:`)
- CSP documentation and recommendations
- Event delegation (CSP nonce-compatible) — 基础框架已就位，inline onclick 迁移进行中

### Accessibility
- ARIA live regions (`role="log"`, `aria-live`, `aria-atomic`)
- Screen-reader-friendly streaming updates
- Keyboard shortcuts: Enter / Shift+Enter / Ctrl+Enter / Escape
- WCAG contrast analysis with recommendations
- `prefers-reduced-motion` support

### Performance
- Incremental rendering (80-char threshold for SSE streaming)
- AbortController-managed async cleanup
- Image lazy loading + async decoding
- KaTeX `throwOnError: false` graceful fallback
- Mermaid render scoped to current content (no global re-render)
- CDN dependency sync-check (no 3s delay)
- `cleanToolOutput` O(n) streaming filter

### Cross-Framework
- 4 framework adapters: React, Vue 3, Angular, Svelte
- TypeScript type definitions
- DOMPurify hook integration in all frameworks

### Backend
- SSE endpoints for FastAPI, Django, Flask
- Threading example for Flask (queue-based non-blocking)
- `_extract_answer` interface with CrewAI / OpenAI SDK examples
- SSE chunk-size rationale (24 chars ≈ 3 tokens)
- 6 reverse proxy configurations: nginx, Caddy, Traefik, HAProxy, AWS ALB, Cloudflare

### Encoding
- Root cause analysis: tiktoken single-token decode → U+FFFD
- GBK/UTF-8 mixing diagnosis ("锟斤拷" pattern)
- Step-by-step diagnostic code insertion guide
- Tokenizer compatibility matrix (5 tokenizers)
- CJK coverage: Chinese, Japanese (hiragana/katakana), Korean (Hangul)

### Testing
- 11 verification test cases (including XSS attack, dark mode, mobile responsive)
- Encoding round-trip validation
- CDN health check with HEAD→GET fallback
- `UnicodeDecodeError` protection in SSE line reader

### Documentation
- 11 reference guides covering all skill facets
- Reading-order recommendations for new users
- Cross-document consistency: all examples verified against authoritative templates
- Troubleshooting manual with 6-step escalation flow

### Infrastructure
- MIT License
- .gitignore (Python, macOS, Windows, IDE)
- Design spec preserved as `CLAUDE_CODE_PROMPT.md`
