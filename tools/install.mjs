#!/usr/bin/env node
/**
 * 统一技能安装器 / Universal skill installer
 *
 * 零依赖，只用 Node 标准库。把这个技能仓安装到本机各个 AI 应用的 skills 目录，
 * 替代「下载 zip → 手动解压 → 逐个目录拷贝」的流程。
 *
 * 用法 / Usage:
 *   node tools/install.mjs --list
 *   node tools/install.mjs --ai workbuddy
 *   node tools/install.mjs --ai trae-cn --ai codebuddy
 *   node tools/install.mjs --ai all --dry-run
 *   node tools/install.mjs --ai all --force
 *   node tools/install.mjs --ai workbuddy --uninstall
 *   node tools/install.mjs --project --ai workbuddy
 *   node tools/install.mjs --dir "D:/somewhere/skills"
 *
 * 退出码: 0 成功 / 1 用法错误或安装失败
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const C = process.stdout.isTTY
  ? { r: '\x1b[31m', g: '\x1b[32m', y: '\x1b[33m', b: '\x1b[36m', d: '\x1b[2m', x: '\x1b[0m' }
  : { r: '', g: '', y: '', b: '', d: '', x: '' };

/**
 * 安装目标表。global 为全局目录，project 为随项目走的相对目录。
 * 这些路径已在本机逐一核对过：带 verified 标记的目录确实存在且装有技能。
 * 新增 AI 应用时只改这里。
 */
const TARGETS = {
  workbuddy: { label: 'WorkBuddy', global: '~/.workbuddy/skills', project: '.workbuddy/skills', verified: true },
  'trae-cn': { label: 'TRAE 国内版', global: '~/.trae-cn/skills', project: '.trae-cn/skills', verified: true },
  codebuddy: { label: 'CodeBuddy', global: '~/.codebuddy/skills', project: '.codebuddy/skills', verified: true },
  claude: { label: 'Claude Code', global: '~/.claude/skills', project: '.claude/skills', verified: true },
  codex: { label: 'Codex CLI', global: '~/.codex/skills', project: '.codex/skills', verified: true },
  openclaw: { label: 'OpenClaw', global: '~/.openclaw/workspace/skills', project: '.openclaw/skills', verified: true },
  qwen: { label: 'Qwen Code', global: '~/.qwen/skills', project: '.qwen/skills', verified: true },
  'cc-switch': { label: 'cc-switch', global: '~/.cc-switch/skills', project: '.cc-switch/skills', verified: true },
  cursor: { label: 'Cursor', global: '~/.cursor/skills', project: '.cursor/skills', verified: false },
  agents: { label: '通用 .agents', global: '~/.agents/skills', project: '.agents/skills', verified: false },
};

/** 不复制的内容：版本控制、依赖、缓存、编辑器产物。 */
const SKIP = new Set(['.git', '.github', 'node_modules', '.venv', 'venv', '__pycache__', '.DS_Store', '.workbuddy', '.claude', '.trae-cn', '.codebuddy', '.cursor']);

function expand(p) {
  return p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p;
}

/** 从 SKILL.md 的 frontmatter 读取 name，读不到就用目录名。 */
function readSkillMeta() {
  const fallback = path.basename(REPO_ROOT);
  let name = fallback;
  let description = '';
  const skillFile = path.join(REPO_ROOT, 'SKILL.md');
  if (fs.existsSync(skillFile)) {
    const head = fs.readFileSync(skillFile, 'utf8').slice(0, 4000);
    const m = head.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (m) {
      const nm = m[1].match(/^name:\s*(.+)$/m);
      if (nm) name = nm[1].trim().replace(/^["']|["']$/g, '');
      const dm = m[1].match(/^description:\s*(.+)$/m);
      if (dm) description = dm[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  let version = '';
  const pkg = path.join(REPO_ROOT, 'package.json');
  if (fs.existsSync(pkg)) {
    try { version = JSON.parse(fs.readFileSync(pkg, 'utf8')).version || ''; } catch { /* 忽略损坏的 package.json */ }
  }
  return { name, version, description };
}

function parseArgs(argv) {
  const opts = { ai: [], project: false, dir: null, dryRun: false, force: false, uninstall: false, list: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--ai') {
      const v = argv[++i];
      if (!v) { console.error(`${C.r}--ai 后面要跟平台 id，例如 --ai workbuddy。用 --list 查看全部 id。${C.x}`); process.exit(1); }
      opts.ai.push(v);
    } else if (a === '--project') opts.project = true;
    else if (a === '--dir') {
      const v = argv[++i];
      if (!v) { console.error(`${C.r}--dir 后面要跟目录路径。${C.x}`); process.exit(1); }
      opts.dir = v;
    } else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--force') opts.force = true;
    else if (a === '--uninstall') opts.uninstall = true;
    else if (a === '--list') opts.list = true;
    else if (a === '-h' || a === '--help') opts.help = true;
    else { console.error(`${C.r}不认识的参数: ${a}${C.x}`); opts.help = true; break; }
  }
  return opts;
}

const HELP = `
${C.b}统一技能安装器${C.x} — 把这个技能装到本机各个 AI 应用

  node tools/install.mjs --list                      列出所有可安装的目标
  node tools/install.mjs --ai workbuddy              装到 WorkBuddy
  node tools/install.mjs --ai trae-cn --ai codebuddy 一次装多个
  node tools/install.mjs --ai all                    装到全部目标
  node tools/install.mjs --ai all --dry-run          只预览，不写文件
  node tools/install.mjs --ai all --force            覆盖已存在的旧版本
  node tools/install.mjs --ai workbuddy --uninstall   卸载
  node tools/install.mjs --project --ai workbuddy     装到当前项目的相对目录
  node tools/install.mjs --dir "D:/my/skills"         装到一个自定义目录

  --dry-run  只打印将要做什么，不写任何文件
  --force    目标已存在时直接覆盖。不加这个参数会停下来问你要不要覆盖
  --project  用相对目录装进当前项目，而不是全局目录

  注意：安装前会检查 SKILL.md 是否在仓库根目录。不在就报错退出，
  因为多数 AI 应用只认「技能目录/SKILL.md」这一种结构。
`;

function list() {
  const meta = readSkillMeta();
  console.log(`\n技能: ${C.b}${meta.name}${C.x}${meta.version ? `  v${meta.version}` : ''}`);
  console.log(`源目录: ${REPO_ROOT}`);
  console.log('\n可安装到的目标:\n');
  console.log('  id          应用                全局目录                                       已在本机核对');
  console.log('  ' + '-'.repeat(88));
  for (const [id, t] of Object.entries(TARGETS)) {
    const mark = t.verified ? `${C.g}是${C.x}` : `${C.y}否${C.x}`;
    const pad = ' '.repeat(Math.max(0, 12 - id.length));
    const label = t.label + ' '.repeat(Math.max(0, 18 - t.label.length - (t.label.match(/[\u4e00-\u9fa5]/g)?.length || 0)));
    const dir = t.global + ' '.repeat(Math.max(0, 46 - t.global.length));
    console.log(`  ${id}${pad}${label}${dir}${mark}`);
  }
  console.log(`\n  加 --project 则改为装到当前项目下的相对目录（如 ${Object.values(TARGETS)[0].project}）`);
  console.log(`  未核对的目标填的是该应用的通行约定，装之前建议先确认目录确实存在\n`);
}

function copyFilter(src) {
  return !SKIP.has(path.basename(src));
}

function run(opts) {
  const meta = readSkillMeta();

  const skillFile = path.join(REPO_ROOT, 'SKILL.md');
  if (!fs.existsSync(skillFile)) {
    console.error(`\n${C.r}安装中止：仓库根目录下找不到 SKILL.md。${C.x}`);
    console.error(`当前根目录: ${REPO_ROOT}`);
    console.error('多数 AI 应用只认「技能目录/SKILL.md」这一种结构。如果 SKILL.md 在子目录里，');
    console.error('请先把它移到根目录（或改用指向正确目录的 --dir），否则装过去也不会被识别。\n');
    process.exit(1);
  }

  // 解析目标目录
  const jobs = [];
  for (const id of opts.ai) {
    if (id === 'all') {
      for (const [tid, t] of Object.entries(TARGETS)) {
        jobs.push({ id: tid, label: t.label, base: expand(opts.project ? t.project : t.global), project: opts.project });
      }
      continue;
    }
    const t = TARGETS[id];
    if (!t) {
      console.error(`${C.r}未知目标 "${id}"。用 --list 查看可用 id。${C.x}`);
      process.exit(1);
    }
    jobs.push({ id, label: t.label, base: expand(opts.project ? t.project : t.global), project: opts.project });
  }
  if (opts.dir) jobs.push({ id: '(--dir)', label: '自定义目录', base: path.resolve(expand(opts.dir)), project: false });

  if (jobs.length === 0) {
    console.error(`${C.r}没有指定安装目标。用 --ai <id> 指定，或 --ai all 装到全部。${C.x}`);
    console.error('不确定有哪些目标就跑 node tools/install.mjs --list');
    process.exit(1);
  }

  // 目标目录不能和源目录重合，否则会自己拷自己
  const dests = jobs.map((j) => path.resolve(j.base, meta.name));
  if (dests.some((d) => d === REPO_ROOT || REPO_ROOT.startsWith(d + path.sep))) {
    console.error(`${C.r}安装中止：目标目录和源目录重合（${REPO_ROOT}）。${C.x}`);
    console.error('请换一个目标目录，或确认你没有在技能自己的目录里执行 --project。\n');
    process.exit(1);
  }

  console.log('');
  console.log(`${opts.uninstall ? '卸载' : '安装'} ${C.b}${meta.name}${C.x}${meta.version ? ` v${meta.version}` : ''}`);
  console.log(`${C.d}源目录 ${REPO_ROOT}${C.x}`);
  if (opts.dryRun) console.log(`${C.y}--dry-run：下面只预览，不会真的写文件${C.x}`);
  console.log('');

  let ok = 0, skipped = 0, failed = 0;

  jobs.forEach((j, i) => {
    const dest = dests[i];
    const existed = fs.existsSync(dest);
    const tag = `${opts.uninstall ? '卸载' : '安装'} → ${j.label}`;

    if (opts.uninstall) {
      if (!existed) {
        console.log(`  ${C.d}跳过${C.x}  ${tag}  ${C.d}未安装（${dest}）${C.x}`);
        skipped++;
        return;
      }
      if (opts.dryRun) {
        console.log(`  ${C.y}预览${C.x}  ${tag}  将删除 ${dest}`);
        ok++;
        return;
      }
      try {
        fs.rmSync(dest, { recursive: true, force: true });
        console.log(`  ${C.g}完成${C.x}  ${tag}  已删除 ${dest}`);
        ok++;
      } catch (e) {
        console.log(`  ${C.r}失败${C.x}  ${tag}  ${e.message}`);
        failed++;
      }
      return;
    }

    // 安装
    if (existed && !opts.force) {
      console.log(`  ${C.y}跳过${C.x}  ${tag}  目标已存在：${dest}`);
      console.log(`        ${C.d}要覆盖就加 --force${C.x}`);
      skipped++;
      return;
    }
    if (opts.dryRun) {
      console.log(`  ${C.y}预览${C.x}  ${tag}  将写入 ${dest}`);
      ok++;
      return;
    }
    try {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      if (existed) fs.rmSync(dest, { recursive: true, force: true });
      fs.cpSync(REPO_ROOT, dest, { recursive: true, filter: copyFilter });
      console.log(`  ${C.g}完成${C.x}  ${tag}  ${dest}`);
      ok++;
    } catch (e) {
      console.log(`  ${C.r}失败${C.x}  ${tag}  ${e.message}`);
      failed++;
    }
  });

  console.log('');
  console.log(`${C.d}完成 ${ok} / 跳过 ${skipped} / 失败 ${failed}${C.x}`);

  if (!opts.uninstall && ok > 0 && !opts.dryRun) {
    console.log('');
    console.log('下一步：重启对应的 AI 应用，然后在对话里触发这个技能。');
    console.log(`如果装了以后没反应，先确认 ${C.b}${path.join(dests[0], 'SKILL.md')}${C.x} 存在。`);
  }
  if (failed > 0) {
    console.log('');
    console.log('有安装失败的目标。常见原因：目录被应用占用（先关掉应用再试）、没有写权限。');
    process.exit(1);
  }
  console.log('');
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help || (!opts.list && opts.ai.length === 0 && !opts.dir)) {
  console.log(HELP);
  process.exit(opts.help ? 0 : 1);
}
if (opts.list) list();
else run(opts);
