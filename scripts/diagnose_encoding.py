#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""编码诊断脚本 — 检查 Python 环境、文件编码、字符串处理链路。

作者：Yardon | markdown-renderer-fix Skill

用法:
    python diagnose_encoding.py                      # 基础诊断
    python diagnose_encoding.py --test-text "你好世界"  # 测试指定文本
    python diagnose_encoding.py --test-sse            # 测试 SSE 输出链路
    python diagnose_encoding.py --framework           # 检测 Web 框架
    python diagnose_encoding.py --deps                # 检测前端依赖库版本
    python diagnose_encoding.py --full                # 全面诊断
"""

import sys
import os
import json
import locale
import argparse


def diagnose_environment():
    """诊断当前编码环境。"""
    print("=" * 60)
    print("编码环境诊断")
    print("=" * 60)

    print(f"  sys.stdout.encoding:    {sys.stdout.encoding}")
    print(f"  sys.stdin.encoding:     {sys.stdin.encoding}")
    print(f"  sys.getdefaultencoding(): {sys.getdefaultencoding()}")
    print(f"  sys.getfilesystemencoding(): {sys.getfilesystemencoding()}")
    print(f"  locale.getpreferredencoding(): {locale.getpreferredencoding()}")
    print(f"  PYTHONIOENCODING:       {os.environ.get('PYTHONIOENCODING', '(not set)')}")
    print(f"  LANG:                   {os.environ.get('LANG', '(not set)')}")
    print()


def diagnose_json_roundtrip(text):
    """测试 json.dumps + JSON.parse 往返链路。"""
    print("-" * 40)
    print(f"测试文本: {text}")
    print(f"  长度: {len(text)} 字符")
    print(f"  repr: {repr(text)}")

    # json.dumps (后端)
    encoded = json.dumps(text)
    print(f"  json.dumps: {repr(encoded)}")
    print(f"  json.dumps 长度: {len(encoded)}")

    # json.loads (前端等价)
    decoded = json.loads(encoded)
    print(f"  json.loads: {repr(decoded)}")

    if text == decoded:
        print("  ✅ 往返一致")
    else:
        print(f"  ❌ 不一致! 原文={repr(text)}, 解码={repr(decoded)}")
    print()


def diagnose_tiktoken(text):
    """测试 tiktoken 编码/解码链路。"""
    print("-" * 40)
    try:
        import tiktoken
        enc = tiktoken.get_encoding("cl100k_base")
    except ImportError:
        print("  ⚠️ tiktoken 未安装，跳过")
        print()
        return

    # 编码
    tokens = enc.encode_ordinary(text)
    print(f"  Token 数量: {len(tokens)}")
    print(f"  Token IDs: {tokens[:20]}{'...' if len(tokens) > 20 else ''}")

    # ✅ 正确：一次性解码
    full_decoded = enc.decode(tokens)
    print(f"  一次性解码: {repr(full_decoded)}")
    print(f"  {'✅' if full_decoded == text else '❌'} 原文对比")

    # ❌ 错误：逐个 token 解码（展示问题）
    single_decoded = []
    for tid in tokens:
        try:
            single_decoded.append(enc.decode([tid]))
        except Exception:
            single_decoded.append("[ERR]")
    combined = "".join(single_decoded)
    has_ufffd = "�" in combined
    print(f"  逐 token 解码: {repr(combined[:60])}{'...' if len(combined) > 60 else ''}")
    print(f"  包含 U+FFFD: {'❌ 是 — 这就是乱码根因!' if has_ufffd else '✅ 否'}")

    # 展示具体的 U+FFFD token
    if has_ufffd:
        bad_tokens = [(i, tid, enc.decode([tid]))
                      for i, tid in enumerate(tokens)
                      if "�" in enc.decode([tid])]
        print(f"  乱码 token (前 10 个):")
        for i, tid, val in bad_tokens[:10]:
            print(f"    [{i}] tid={tid} → {repr(val)}")
    print()


def diagnose_framework():
    """检测当前项目使用的 Web 框架。"""
    print("-" * 40)
    print("框架检测")
    cwd = os.getcwd()
    package_json = os.path.join(cwd, "package.json")
    if os.path.exists(package_json):
        try:
            with open(package_json, "r", encoding="utf-8") as f:
                pkg = json.load(f)
            deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
            frameworks = []
            for fw in ["react", "vue", "angular", "svelte", "next", "nuxt"]:
                if fw in deps or fw.lower() in str(deps).lower():
                    frameworks.append(fw)
            if frameworks:
                print(f"  检测到前端框架: {', '.join(frameworks)}")
                print(f"  详见 references/framework_adaptation.md")
            else:
                print("  未检测到主流框架（可能是原生 HTML/JS）")
            if "marked" in deps:
                print(f"  marked 版本: {deps.get('marked', 'unknown')}")
            if "highlight.js" in deps:
                print(f"  highlight.js 版本: {deps.get('highlight.js', 'unknown')}")
        except Exception:
            print("  读取 package.json 失败")
    else:
        # Check for Python framework
        pyproject = os.path.join(cwd, "pyproject.toml")
        if os.path.exists(pyproject):
            try:
                with open(pyproject, "r", encoding="utf-8") as f:
                    content = f.read()
                for pyfw in ["fastapi", "flask", "django"]:
                    if pyfw in content.lower():
                        print(f"  检测到后端框架: {pyfw}")
            except Exception:
                pass
        if not os.path.exists(pyproject):
            print("  未检测到 package.json 或 pyproject.toml")
    print()


def diagnose_dependencies():
    """检测前端依赖库版本。"""
    print("-" * 40)
    print("前端依赖库检测")
    cwd = os.getcwd()
    package_json = os.path.join(cwd, "package.json")
    if os.path.exists(package_json):
        try:
            with open(package_json, "r", encoding="utf-8") as f:
                pkg = json.load(f)
            deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
            for lib in ["marked", "highlight.js", "katex", "mermaid", "dompurify"]:
                ver = deps.get(lib, "❌ 未安装")
                print(f"  {lib}: {ver}")
        except Exception:
            print("  读取失败")
    else:
        print("  未找到 package.json（非 Node.js 项目）")
    print()


def generate_report(args):
    """根据检测结果生成修复建议。"""
    print("=" * 60)
    print("修复建议报告")
    print("=" * 60)
    issues = []

    # 检查环境编码
    if sys.stdout.encoding and sys.stdout.encoding.lower() not in ('utf-8', 'utf8'):
        issues.append("⚠️  stdout 编码不是 UTF-8 → 设置 PYTHONIOENCODING=utf-8")
    if not os.environ.get("PYTHONIOENCODING"):
        issues.append("💡 建议设置 PYTHONIOENCODING=utf-8 环境变量")

    # 检查 tiktoken
    try:
        import tiktoken
        enc = tiktoken.get_encoding("cl100k_base")
        test_tokens = enc.encode_ordinary(args.test_text)
        full = enc.decode(test_tokens)
        single = [enc.decode([t]) for t in test_tokens]
        if "�" in "".join(single):
            issues.append("❌ tiktoken 单 token 解码存在 U+FFFD → 改用 enc.decode(all_tokens)")
        if full != args.test_text:
            issues.append("❌ tiktoken 全量解码不一致 → 检查 tokenizer 配置")
        else:
            print("  ✅ tiktoken 全量解码正确")
    except ImportError:
        print("  ℹ️  tiktoken 未安装（跳过检查）")

    for issue in issues:
        print(f"  {issue}")
    if not issues:
        print("  ✅ 未检测到编码问题")
    print()


def test_real_sse(endpoint="http://127.0.0.1:18765/api/chat/stream", test_text="你好世界"):
    """实际测试 SSE 端点（HTTP 请求）。"""
    import urllib.request
    import urllib.error

    print("-" * 40)
    print(f"实际 SSE 测试: {endpoint}")
    req = urllib.request.Request(
        endpoint,
        data=json.dumps({"message": test_text, "session_id": "diagnose-test"}).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            lines = []
            for _ in range(20):
                line = resp.readline()
                if not line:
                    break
                lines.append(line.decode("utf-8").strip())

            full_text = "\n".join(lines)
            has_ufffd = "�" in full_text

            print(f"  状态码: {resp.status}")
            print(f"  Content-Type: {resp.headers.get('Content-Type', 'N/A')}")
            print(f"  收到 {len(lines)} 行 SSE 数据")
            print(f"  包含 U+FFFD: {'❌ 是 — 乱码!' if has_ufffd else '✅ 否'}")

            if has_ufffd:
                # 定位乱码行
                for i, line in enumerate(lines):
                    if "�" in line:
                        print(f"  乱码行 #{i}: {line[:100]}")
                        break

            if lines:
                print(f"  首行: {lines[0][:120]}")
                # 检查是否有 [PING]、[DONE]、JSON 分块
                has_ping = any("[PING]" in l for l in lines)
                has_done = any("[DONE]" in l for l in lines)
                has_json = any(l.startswith('"') for l in lines)
                print(f"  含 [PING]: {'✅' if has_ping else '⚠️ 无保活信号'}")
                print(f"  含 [DONE]: {'✅' if has_done else '⚠️ 无结束信号'}")
                print(f"  含 JSON 分块: {'✅' if has_json else '⚠️ 非 JSON 编码'}")
    except urllib.error.URLError as e:
        print(f"  ❌ 连接失败: {e}")
        print(f"  提示: 确保后端服务已启动，端口正确")
    except Exception as e:
        print(f"  ❌ 测试异常: {e}")


def main():
    parser = argparse.ArgumentParser(description="编码诊断脚本 — markdown-renderer-fix Skill")
    parser.add_argument("--test-text", default="你好世界！Hello World! 🚀",
                        help="测试文本")
    parser.add_argument("--test-sse", action="store_true",
                        help="模拟 SSE 分块往返测试")
    parser.add_argument("--real-sse", action="store_true",
                        help="实际测试 HTTP SSE 端点（需要后端运行）")
    parser.add_argument("--endpoint", default="http://127.0.0.1:18765/api/chat/stream",
                        help="SSE 端点 URL（默认 http://127.0.0.1:18765/api/chat/stream）")
    parser.add_argument("--framework", action="store_true",
                        help="检测 Web 框架")
    parser.add_argument("--deps", action="store_true",
                        help="检测前端依赖库")
    parser.add_argument("--full", action="store_true",
                        help="全面诊断（包含框架 + 依赖 + 报告 + 实际 SSE）")
    args = parser.parse_args()

    diagnose_environment()
    diagnose_json_roundtrip(args.test_text)
    diagnose_tiktoken(args.test_text)

    if args.test_sse or args.full:
        print("-" * 40)
        print("SSE 链路测试")
        text = args.test_text * 3
        chunk_size = 24
        chunks = []
        for i in range(0, len(text), chunk_size):
            chunk = text[i:i + chunk_size]
            chunks.append(json.dumps(chunk))
            sse_line = f"data: {chunks[-1]}\n\n"
            print(f"  SSE chunk {len(chunks)}: {sse_line.strip()}")
        rebuilt = ""
        for c in chunks:
            rebuilt += json.loads(c)
        print(f"  重建结果: {repr(rebuilt)}")
        print(f"  {'✅' if rebuilt == text else '❌'} 往返一致")

    if args.framework or args.full:
        diagnose_framework()

    if args.deps or args.full:
        diagnose_dependencies()

    if args.full:
        generate_report(args)

    if args.real_sse or args.full:
        test_real_sse(args.endpoint, args.test_text)


if __name__ == "__main__":
    main()
