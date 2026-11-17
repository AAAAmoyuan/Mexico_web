# Cloudflare 静态站 — JUESHITUO 手机壳落地页

单页静态站（纯 HTML/CSS/JS，无构建步骤），可直接上传 Cloudflare Pages。

## 目录

```
index.html              页面（全部文案在 HTML 里）
assets/css/style.css    样式
assets/js/main.js       轮播 / 顶栏 / 入场动画
assets/img/             hero 背景、产品图、卖点图
_headers                Cloudflare Pages 缓存与安全头
robots.txt
_tools/make-heroes.py   可选：重新生成 hero 背景图（需要 Pillow）
_preview/               本地预览截图（上传时可删）
手机壳/                 你提供的原始竖图（源素材，可删）
```

## 本地预览

```bash
python -m http.server 8080
# 或
npx serve .
```

打开 http://localhost:8080（不要直接双击 index.html，用 http 服务更接近线上）。

## 部署到 Cloudflare Pages

只需要上传 **`index.html` + `assets/` + `_headers` + `robots.txt`**；`手机壳/`、`_tools/`、`_preview/` 不用上传。

1. Cloudflare 控制台 → Workers & Pages → Create → Pages → Upload assets
2. 把上面这些文件/目录拖进去，或 `wrangler pages deploy . --project-name=xxx`
3. 默认地址 `xxx.pages.dev`，需要的话再绑自定义域名

## 图片说明

- `hero-1/2/3`：由 `手机壳/手机壳.webp` 抠图后合成到暗酒红影棚背景，1920×1080；`-mobile` 为 1080×1350 竖版
- `product-cutout`：抠好的产品图（透明背景），用于产品区
- `product-main`：原竖图，用于 MagSafe 区块
- `feature-*.webp`：你提供的 5 张卖点信息图（西语）

替换方法：保持同名覆盖即可，宽高比尽量一致（hero 16:9、mobile 4:5）。

## 需要你改的地方

- **品牌名**：当前用 `JUESHITUO`（取自你给的商品描述），在 `index.html` 里搜索替换即可（顶栏、页脚、品牌段）
- **购买链接**：所有 CTA 已统一指向你的 Mercado Libre 商品页：
  `https://www.mercadolibre.com.mx/funda-para-iphone-18-pro-con-protector-de-camara-y-magsafe/up/MLMU5112836898`
- **价格**：页面暂未写价格，需要的话我可以加一行 `$XXX MXN` 或划线价

## 备注

- 顶栏导航 / 轮播 / 懒加载 / 响应式均已实现；hero 支持自动轮播、箭头、圆点、手机滑动
- 页面语言为西班牙语（`lang="es"`），卖点图自带西语文案，语言统一
- Apple / iPhone 为 Apple Inc. 商标，页脚已加免责声明
