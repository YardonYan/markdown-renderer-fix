#!/usr/bin/env node
/**
 * 为每个技能仓生成插件清单，让它能被支持插件市场的 AI 应用直接安装。
 *
 * 生成两类文件：
 *   .codebuddy-plugin/plugin.json        WorkBuddy / CodeBuddy 的插件清单
 *   .codebuddy-plugin/marketplace.json   把本仓自己作为一个单插件市场列出
 *   .claude-plugin/plugin.json           Claude Code 的插件清单
 *   .claude-plugin/marketplace.json      Claude Code 的单插件市场
 *
 * 字段取自应用自带的插件清单（同名键、同枚举值），不自己发明字段。
 *
 * 用法 / Usage:
 *   node tools/build_plugins.mjs                 自动发现同级的兄弟技能仓
 *   node tools/build_plugins.mjs ../a ../b       指定仓库路径
 *   node tools/build_plugins.mjs --check         只校验，不写文件
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const argRepos = process.argv.slice(2).filter((a) => !a.startsWith('--'));

/** 一个技能仓要能被识别，就必须在根目录有 SKILL.md。 */
function isSkillRepo(dir) {
  return fs.existsSync(path.join(dir, 'SKILL.md'));
}

function discover() {
  if (argRepos.length) return argRepos.map((p) => path.resolve(ROOT, p)).filter(isSkillRepo);
  const parent = path.dirname(ROOT);
  return fs
    .readdirSync(parent, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => path.join(parent, e.name))
    .filter(isSkillRepo)
    .sort();
}

function readMeta(dir) {
  const md = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8');
  const fm = md.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const name = (fm.match(/^name:\s*(.+)$/m)?.[1] ?? path.basename(dir)).trim().replace(/^["']|["']$/g, '');

  // description 可能是单行，也可能是 `|` / `>-` 引出的块标量。
  // 注意不能写成 /^description:\s*(?!>|\|)(.+)$/ —— \s* 会回溯，
  // 让后面的负向先行断言失效，把 `description: |` 的单行值取成 "|"。
  let desc = '';
  const inline = fm.match(/^description:[ \t]*(.+)$/m);
  if (inline && !/^[>|]/.test(inline[1].trim())) {
    desc = inline[1].trim().replace(/^["']|["']$/g, '');
  } else {
    const block = fm.match(/^description:[ \t]*[>|]-?[ \t]*\r?\n([\s\S]*?)(?=\r?\n[a-zA-Z_-]+:|\s*$)/m);
    if (block) desc = block[1].split(/\r?\n/).map((l) => l.trim()).filter(Boolean).join(' ');
  }
  // 只取第一句，插件清单里放太长。
  const full = desc.trim();
  const first = full.split(/(?<=[。.])\s?/)[0]?.trim() || full;
  desc = first.length > 160 ? first.slice(0, 157).trimEnd() + '...' : first;

  let version = '';
  const pkg = path.join(dir, 'package.json');
  if (fs.existsSync(pkg)) {
    try { version = JSON.parse(fs.readFileSync(pkg, 'utf8')).version || ''; } catch { /* 继续找别处 */ }
  }
  if (!version) version = fm.match(/^version:\s*['"]?([\d.]+)['"]?$/m)?.[1] ?? '';
  // 没有 package.json、frontmatter 也没写版本时，从 README 的徽章读，
  // 例如 shields.io/badge/version-3.0.0-green。
  if (!version) {
    const readme = path.join(dir, 'README.md');
    if (fs.existsSync(readme)) {
      const badge = fs.readFileSync(readme, 'utf8').match(/badge\/version-(\d+(?:\.\d+)*)-/);
      if (badge) version = badge[1];
    }
  }
  if (!version) version = '1.0.0';

  return { name, description: desc, longDescription: full, version, dir, prompts: readPrompts(dir, name) };
}

/**
 * 从 README 的「示例提示 / Example Prompts」小节取前两条，作为 Codex 的 defaultPrompt。
 * 取不到就用一句由技能名拼出的通用提示，不留空数组。
 */
function readPrompts(dir, name) {
  const readme = path.join(dir, 'README.md');
  if (fs.existsSync(readme)) {
    const text = fs.readFileSync(readme, 'utf8');
    const sec = text.match(/^##\s*(?:示例提示|Example Prompts)\s*$([\s\S]*?)(?=^##\s|\Z)/m);
    if (sec) {
      const items = [...sec[1].matchAll(/^[-*]\s+[「"']?(.+?)[」"']?\s*$/gm)]
        .map((m) => m[1].replace(/[。.]$/, '').trim())
        .filter((s) => s.length > 4 && s.length < 120);
      if (items.length >= 2) return items.slice(0, 2);
      if (items.length === 1) return [items[0], `用 ${name} 处理当前项目里的相关任务`];
    }
  }
  return [`用 ${name} 处理当前项目里的相关任务`, `帮我看看这个项目的代码，用 ${name} 的规则来改`];
}

function pluginManifest(meta, dir) {
  return {
    name: meta.name,
    version: meta.version,
    description: meta.description,
    author: { name: 'Yardon', url: 'https://github.com/YardonYan' },
    license: 'Apache-2.0',
    homepage: `https://github.com/YardonYan/${path.basename(dir)}`,
    repository: `https://github.com/YardonYan/${path.basename(dir)}`,
    category: 'skill',
    keywords: ['agent-skill', 'ai-skill', meta.name],
  };
}

/** Claude Code：字段与 CodeBuddy 基本一致，不需要 skills 字段（市场清单里指）。 */
function claudeManifest(meta, dir) {
  const m = pluginManifest(meta, dir);
  delete m.category;
  return m;
}

/**
 * Codex：在通用字段之外多了 skills 路径与 interface 展示块。
 * 字段结构照 obra/superpowers 的 .codex-plugin/plugin.json 写。
 * 没有品牌色与图标资源就不填，不编造。
 */
function codexManifest(meta, dir) {
  const repo = `https://github.com/YardonYan/${path.basename(dir)}`;
  const logo = findLogo(dir);
  const iface = {
    displayName: meta.name,
    shortDescription: meta.description,
    longDescription: meta.longDescription,
    developerName: 'Yardon',
    category: 'Developer Tools',
    capabilities: ['Read', 'Write'],
    defaultPrompt: meta.prompts,
    websiteURL: repo,
    screenshots: [],
  };
  if (logo) iface.logo = logo;
  return {
    name: meta.name,
    version: meta.version,
    description: meta.description,
    author: { name: 'Yardon', url: 'https://github.com/YardonYan' },
    homepage: repo,
    repository: repo,
    license: 'Apache-2.0',
    keywords: ['agent-skill', 'ai-skill', meta.name],
    skills: './',
    hooks: {},
    interface: iface,
  };
}

/** Cursor：多了 displayName、skills 与 hooks 三个字段。 */
function cursorManifest(meta) {
  const repo = `https://github.com/YardonYan/${path.basename(meta.dir)}`;
  return {
    name: meta.name,
    displayName: meta.name,
    description: meta.description,
    version: meta.version,
    author: { name: 'Yardon', url: 'https://github.com/YardonYan' },
    homepage: repo,
    repository: repo,
    license: 'Apache-2.0',
    keywords: ['agent-skill', 'ai-skill', meta.name],
    skills: './',
    hooks: {},
  };
}

/** 仓库里已有的配图，用作插件图标。没有就返回 null，不编造路径。 */
function findLogo(dir) {
  for (const p of ['assets/hero.png', 'assets/dag-waves.png', 'assets/architecture.png']) {
    if (fs.existsSync(path.join(dir, p))) return './' + p;
  }
  return null;
}

function marketplaceManifest(meta, dir) {
  return {
    name: meta.name,
    description: `${meta.description} (single-plugin marketplace)`,
    owner: { name: 'Yardon', url: 'https://github.com/YardonYan' },
    metadata: { version: meta.version },
    plugins: [
      {
        name: meta.name,
        source: './',
        description: meta.description,
        version: meta.version,
        category: 'skill',
      },
    ],
  };
}

function write(dir, rel, content) {
  const abs = path.join(dir, rel);
  const json = JSON.stringify(content, null, 2) + '\n';
  const existing = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
  if (CHECK) return { rel, changed: existing !== json, exists: existing !== null };
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, json, 'utf8');
  return { rel, changed: existing !== json, exists: existing !== null };
}

const repos = discover();
if (!repos.length) {
  console.error('\n没找到含 SKILL.md 的技能仓。用法：node tools/build_plugins.mjs <仓库路径...>\n');
  process.exit(1);
}

console.log('');
let changedTotal = 0;
for (const dir of repos) {
  const meta = readMeta(dir);
  const results = [
    write(dir, path.join('.codebuddy-plugin', 'plugin.json'), pluginManifest(meta, dir)),
    write(dir, path.join('.codebuddy-plugin', 'marketplace.json'), marketplaceManifest(meta, dir)),
    write(dir, path.join('.claude-plugin', 'plugin.json'), claudeManifest(meta, dir)),
    write(dir, path.join('.claude-plugin', 'marketplace.json'), marketplaceManifest(meta, dir)),
    write(dir, path.join('.codex-plugin', 'plugin.json'), codexManifest(meta, dir)),
    write(dir, path.join('.cursor-plugin', 'plugin.json'), cursorManifest(meta)),
  ];
  const changed = results.filter((r) => r.changed).length;
  changedTotal += changed;
  const tag = CHECK ? (changed ? '有差异' : '一致  ') : '写入  ';
  console.log(`  ${tag}  ${path.basename(dir).padEnd(26)} ${meta.name.padEnd(26)} v${meta.version}`);
}

console.log('');
if (CHECK) {
  if (changedTotal) {
    console.log(`有 ${changedTotal} 个清单文件需要更新。跑 node tools/build_plugins.mjs 生成。\n`);
    process.exit(1);
  }
  console.log('所有插件清单与 SKILL.md 一致。\n');
} else {
  console.log(`已处理 ${repos.length} 个仓库。每个仓现在既能当插件，也能当单插件市场。\n`);
}
