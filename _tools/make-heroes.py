"""重新生成 3 屏 hero 背景（桌面 1920x1080 / 移动 1080x1350）。

用法：python make-heroes.py   （需要 Pillow）
输入：assets/img/product-cutout.png（已抠好的产品图）
输出：assets/img/hero-{1,2,3}.jpg|webp、hero-{1,2,3}-mobile.jpg|webp
文字/按钮/圆点都在 HTML 里，不烘进图片。
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "img"

cutout = Image.open(IMG / "product-cutout.png").convert("RGBA")

GLOWS = [
    ((1300, 520), (120, 32, 60), 165),
    ((1280, 610), (120, 40, 46), 150),
    ((1240, 470), (92, 34, 74), 160),
]


def vertical_gradient(size, top, bottom):
    w, h = size
    img = Image.new("RGB", (w, h))
    draw = ImageDraw.Draw(img)
    for y in range(h):
        t = y / (h - 1)
        draw.line([(0, y), (w, y)], fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return img


def radial(base, center, radius, color, strength):
    w, h = base.size
    glow = Image.new("RGB", (w, h), (0, 0, 0))
    draw = ImageDraw.Draw(glow)
    cx, cy = center
    steps = 90
    for i in range(steps, 0, -1):
        r = radius * i / steps
        a = int(strength * (1 - i / steps) ** 1.8)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=tuple(int(c * a / 255) for c in color))
    glow = glow.filter(ImageFilter.GaussianBlur(radius / 8))
    return ImageChops.add(base, glow)


def vignette(img, strength=200):
    w, h = img.size
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).ellipse([-w * 0.3, -h * 0.4, w * 1.3, h * 1.4], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(260 * w / 1920))
    dark = Image.new("RGB", (w, h), (0, 0, 0))
    return Image.composite(img, dark, mask.point(lambda v: 255 - int((255 - v) * strength / 255)))


def grain(img, amount=3.5, seed=7):
    w, h = img.size
    rng = np.random.default_rng(seed)
    arr = np.asarray(img).astype(np.float32)
    return Image.fromarray(np.clip(arr + rng.normal(0, amount, (h, w, 1)), 0, 255).astype(np.uint8))


def paste_product(canvas, height, x, y, shadow=0.55, blur=46, offset=(30, 34)):
    w, h = canvas.size
    ratio = height / cutout.height
    prod = cutout.resize((max(1, int(cutout.width * ratio)), height), Image.LANCZOS)
    shadow_img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    silhouette = Image.new("RGBA", prod.size, (0, 0, 0, 255))
    silhouette.putalpha(prod.split()[3])
    shadow_img.paste(silhouette, (x + offset[0], y + offset[1]), silhouette)
    shadow_img = shadow_img.filter(ImageFilter.GaussianBlur(blur))
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    layer.putalpha(shadow_img.split()[3].point(lambda v: int(v * shadow)))
    canvas.paste(Image.new("RGBA", (w, h), (0, 0, 0, 255)), (0, 0), layer)
    canvas.paste(prod, (x, y), prod)
    return canvas


def compose(index, mobile=False):
    center, color, strength = GLOWS[index]
    if mobile:
        canvas = vertical_gradient((1080, 1350), (10, 5, 9), (34, 14, 23))
        canvas = radial(canvas, (540, 980), 700, color, strength - 20)
        canvas = vignette(canvas, 210)
        canvas = grain(canvas, 3)
        w = int(cutout.width * 620 / cutout.height)
        paste_product(canvas, 620, (1080 - w) // 2, 1350 - 620 - 96, shadow=0.5, blur=40)
    else:
        canvas = vertical_gradient((1920, 1080), (12, 6, 10), (32, 13, 22))
        canvas = radial(canvas, center, 850, color, strength)
        canvas = vignette(canvas, 205)
        canvas = grain(canvas, 3)
        paste_product(canvas, 900, 1120, 92)
    return canvas


for i in range(3):
    desktop = compose(i, mobile=False)
    desktop.save(IMG / f"hero-{i + 1}.jpg", quality=90, optimize=True)
    desktop.save(IMG / f"hero-{i + 1}.webp", quality=86)
    mobile = compose(i, mobile=True)
    mobile.save(IMG / f"hero-{i + 1}-mobile.jpg", quality=90, optimize=True)
    mobile.save(IMG / f"hero-{i + 1}-mobile.webp", quality=86)
    print("slide", i + 1, "ok")
print("done")
