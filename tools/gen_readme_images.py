# -*- coding: utf-8 -*-
"""为 markdown-renderer-fix 生成 README 配图。

字体约定：中文一律走 msyh / msyhbd，Consolas 只用于纯英文与代码片段，
否则中文字形会渲染成方块。
"""
import os

from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")

REG = "C:/Windows/Fonts/msyh.ttc"
BOLD = "C:/Windows/Fonts/msyhbd.ttc"
MONO = "C:/Windows/Fonts/consola.ttf"

BG_TOP = (13, 20, 34)
BG_BOT = (24, 38, 63)
CARD = (28, 44, 74)
CARD2 = (35, 54, 88)
LINE = (62, 88, 130)
TXT = (255, 255, 255)
SUB = (150, 166, 188)
DIM = (104, 120, 145)

BLUE = (79, 195, 247)
PURPLE = (167, 139, 250)
MINT = (110, 231, 183)
AMBER = (245, 176, 66)
RED = (248, 113, 113)


def f(path, size):
    return ImageFont.truetype(path, size)


def vgrad(size, c1, c2):
    w, h = size
    strip = Image.new("RGB", (1, h))
    d = ImageDraw.Draw(strip)
    for y in range(h):
        t = y / max(h - 1, 1)
        d.point((0, y), fill=tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3)))
    return strip.resize((w, h))


def card(draw, box, radius=16, fill=CARD, outline=LINE, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def arrow(draw, x1, y, x2, color=LINE, head=10, w=3):
    draw.line([x1, y, x2 - head, y], fill=color, width=w)
    draw.polygon([(x2, y), (x2 - head, y - 7), (x2 - head, y + 7)], fill=color)


def hero():
    W, H = 1500, 560
    img = vgrad((W, H), BG_TOP, BG_BOT)
    d = ImageDraw.Draw(img)

    d.text((80, 88), "markdown-renderer-fix", font=f(BOLD, 62), fill=TXT)
    d.text((80, 182), "一站式修复大模型 SSE 流式输出中的中文乱码、Markdown 渲染异常与前端展示问题",
           font=f(REG, 25), fill=SUB)
    d.text((80, 224), "One-stop fix for garbled Chinese, broken Markdown and SSE issues in LLM apps",
           font=f(REG, 22), fill=DIM)

    d.line([80, 292, 1420, 292], fill=LINE, width=1)

    # 修复前
    card(d, [80, 336, 640, 500], fill=(58, 26, 32), outline=RED, width=2)
    d.text((106, 356), "修复前  BEFORE", font=f(BOLD, 21), fill=RED)
    for i, s in enumerate(["锟斤拷锟斤拷锟斤拷", "ï¿½ï¿½ï¿½ï¿½ï¿½", "æ–‡å—ä¹±ç "]):
        d.text((106, 396 + i * 33), s, font=f(REG, 22), fill=(226, 160, 160))

    # 修复后
    card(d, [860, 336, 1420, 500], fill=(20, 52, 47), outline=MINT, width=2)
    d.text((886, 356), "修复后  AFTER", font=f(BOLD, 21), fill=MINT)
    for i, s in enumerate(["中文正常显示", "Markdown 正确渲染", "公式 · 表格 · Mermaid 全通"]):
        d.text((886, 396 + i * 33), s, font=f(REG, 22), fill=(150, 232, 205))

    d.text([750 - d.textlength("8 阶段全链路排查", font=f(REG, 19)) / 2, 366],
           "8 阶段全链路排查", font=f(REG, 19), fill=AMBER)
    arrow(d, 676, 432, 824, color=AMBER, w=4)

    img.save(os.path.join(OUT, "hero.png"))
    print("hero.png")


def stages():
    W, H = 1500, 680
    img = vgrad((W, H), BG_TOP, BG_BOT)
    d = ImageDraw.Draw(img)

    d.text((70, 44), "乱码出现在哪一环 / Where garbled text comes from",
           font=f(BOLD, 38), fill=TXT)
    d.text((70, 98), "从 token 到页面，前后端一共穿过 8 个数据阶段，任何一环出错都会污染全链路",
           font=f(REG, 23), fill=SUB)

    bw, gap, bh = 252, 24, 124
    x0 = (W - (4 * bw + 3 * gap)) / 2

    back = [("①", "tiktoken 解码 → str", "token to Python str", False),
            ("②", "json.dumps 转义", "escape and serialise", True),
            ("③", ".encode('utf-8')", "bytes on the wire", True),
            ("④", "HTTP 传输", "text/event-stream", False)]
    front = [("⑤", "reader.read()", "stream chunk arrives", False),
             ("⑥", "TextDecoder", "bytes to JS string", True),
             ("⑦", "JSON.parse()", "parse the SSE payload", False),
             ("⑧", "marked.parse()", "render to HTML", True)]

    def row(items, y, label, sub, accent):
        d.text((70, y + 4), label, font=f(BOLD, 26), fill=accent)
        d.text((70, y + 42), sub, font=f(REG, 18), fill=DIM)
        x = x0
        for idx, cn, en, risky in items:
            color = AMBER if risky else accent
            card(d, [x, y, x + bw, y + bh], fill=CARD2 if risky else CARD, outline=color, width=2)
            d.rounded_rectangle([x + 20, y + 20, x + 50, y + 50], radius=8, fill=color)
            fn = f(BOLD, 20)
            d.text((x + 35 - d.textlength(idx, font=fn) / 2, y + 24), idx, font=fn, fill=(13, 20, 34))
            d.text((x + 20, y + 66), cn, font=f(REG, 20), fill=TXT)
            d.text((x + 20, y + 97), en, font=f(REG, 16), fill=DIM)
            if x + bw < x0 + 4 * bw - 1:
                arrow(d, x + bw + 4, y + bh / 2, x + bw + gap - 4, color=accent, w=2, head=8)
            x += bw + gap

    row(back, 210, "后端", "backend", BLUE)
    row(front, 440, "前端", "frontend", PURPLE)

    # 跨行连接
    ax = x0 + 3 * (bw + gap) + bw / 2
    bx = x0 + bw / 2
    d.line([ax, 334, ax, 384], fill=LINE, width=3)
    d.line([ax, 384, bx, 384], fill=LINE, width=3)
    d.line([bx, 384, bx, 430], fill=LINE, width=3)
    d.polygon([(bx, 438), (bx - 8, 428), (bx + 8, 428)], fill=LINE)

    card(d, [70, 588, 1430, 650], radius=14, fill=(58, 26, 32), outline=RED, width=2)
    d.text((98, 606), "任何一个高亮环节出错 → 全链路乱码，往往修完一处又冒出另一处",
           font=f(REG, 23), fill=(240, 168, 168))

    img.save(os.path.join(OUT, "stages.png"))
    print("stages.png")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    hero()
    stages()
