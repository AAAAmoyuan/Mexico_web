# Astro 模块化改造方案（运营可自助新增商品页）

> 目标：让运营在后台点「新建商品」→ 填表 → 发布，就能自动生成一个商品页面并出现在商品列表里，
> 全程不需要开发介入、不需要改代码。
>
> 本文是**方案**，不是实施记录。文末列出需要拍板的 4 个决策点。

---

## 一、目标与非目标

### 要达成

| 能力 | 验收方式 |
|---|---|
| 运营新增商品 | 后台填表单 → 发布 → `/p/<slug>/` 可访问，耗时 < 3 分钟 |
| 商品列表自动更新 | `/productos/` 出现新卡片，按 `order` 排序 |
| 模块化 | 页面由组件拼装，新增一类模块 = 加一个 `.astro` 组件，不动其它页 |
| 构建失败不打死线上 | 构建报错时线上保持上一版，站点不白屏 |
| SEO 不退化 | 每页独立 title/description/og，构建时静态生成，不依赖 JS |

### 不做（本方案范围外）

- 多语言（西语/中文切换）
- 购物车、下单、支付（仍跳 Mercado Libre）
- 后台的所见即所得可视化拖拽

---

## 二、现状与约束

现在这套（`0.2.1`）：

```
index.html            单页三屏，文案由 content.js 从 content/site.json 运行时填充
content/site.json     全部文案
admin/                Decap CMS（单文件集合）
src/worker.js         OAuth 代理 + config.yml 域名注入 + 首页 SEO 标签注入
wrangler.jsonc        assets.directory = "."（仓库根目录整体作为静态资源）
```

三个关键约束：

1. **没有构建步骤** —— `wrangler deploy` 直接把仓库根目录当静态文件上传
2. **文案靠运行时 JS 注入** —— WhatsApp/微信爬虫读不到，所以才有 Worker 里的 SEO 注入补丁
3. **Deploy 走 Workers Builds** —— push 到 main 后自动构建（部署命令 `npx wrangler deploy`）

引入 Astro 后，前两条都会消失：**全部内容在构建时生成静态 HTML**，SEO 注入那段 Worker 代码可以直接删掉。

---

## 三、目标架构

```
运营在 /admin/ 编辑
        │  Decap 通过 GitHub API 提交
        ▼
GitHub 仓库（Markdown / JSON 源文件）
        │  push 触发 Workers Builds
        ▼
npm ci && npm run build   →   dist/（纯静态 HTML）
        │  npx wrangler deploy
        ▼
Cloudflare Worker
   ├── 静态资源 = dist/
   ├── /api/auth、/api/callback   （OAuth，保留现有实现）
   └── /admin/config.yml          （把 __ORIGIN__ 换成当前域名，保留）
```

和现在相比只有两处变化：**多了构建步骤**、**静态资源目录从 `.` 变成 `./dist`**。
OAuth、域名自适应、自动部署这些都不用重做。

---

## 四、内容模型

采用 Astro Content Layer（`src/content.config.ts` + `glob()` loader）。

### 4.1 商品集合 `products`

一个商品 = 一个 Markdown 文件：`src/content/products/<slug>.md`

```yaml
---
title: Funda para iPhone 18 Pro
slug: funda-iphone-18-pro        # URL 用，英文
kicker: Nueva colección
subtitle: Diseño transparente con anillo MagSafe
cover: /uploads/case-product.png
coverAlt: Funda Robin color vino para iPhone 18 Pro
bullets:
  - Anillo MagSafe con imán N56
  - Cristal antiamarilleo
price: 399
currency: MXN
buyLink: https://www.mercadolibre.com.mx/...
buyLabel: Buy Now
order: 10
featured: true
draft: false
seo:
  title: Funda para iPhone 18 Pro con MagSafe
  description: Protección 360°, imán N56 y cristal antiamarilleo.
  ogImage: /uploads/case-product.png
---
正文（可选）：商品详情段落，Markdown 写，页面上渲染在卖点下方。
```

### 4.2 全站设置集合 `site`

沿用现在的 `content/site.json`，挪到 `src/content/site/settings.json`，用 `file()` loader。
保存品牌名、导航、页脚、联系方式、首页 hero——**和商品无关的东西**。

### 4.3 Schema

```ts
// src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const products = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/products' }),
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    kicker: z.string().default(''),
    subtitle: z.string().default(''),
    cover: z.string().default('/uploads/placeholder.png'),
    coverAlt: z.string().default(''),
    bullets: z.array(z.string()).default([]),
    price: z.number().optional(),
    currency: z.string().default('MXN'),
    buyLink: z.string().optional(),
    buyLabel: z.string().default('Buy Now'),
    order: z.number().default(100),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    seo: z
      .object({
        title: z.string().optional(),
        description: z.string().default(''),
        ogImage: z.string().optional(),
      })
      .default({ description: '' }),
  }),
});

const site = defineCollection({
  loader: file('./src/content/site/settings.json'),
  schema: z.object({ /* 品牌、导航、页脚、联系方式 */ }),
});

export const collections = { products, site };
```

> **为什么字段几乎都给 default**：运营少填一个字段不该让整个站构建失败。
> 只有 `title` 是必填，其余都有兜底。

---

## 五、页面与 URL

| 路径 | 内容 | 生成方式 |
|---|---|---|
| `/` | 品牌落地页（沿用现在的三屏叙事） | `src/pages/index.astro` |
| `/productos/` | 商品列表 | `src/pages/productos/index.astro` |
| `/p/<slug>/` | 商品详情 | `src/pages/p/[slug].astro` + `getStaticPaths` |
| `/404` | 404 页 | `src/pages/404.astro` |

### 关键取舍：首页保持三屏叙事

不建议把首页改成商品列表——三屏是这套设计的核心，改成列表会毁掉视觉。
做法：

- **首页**：三屏保留，第 1、2 屏的图/文案改为读取 `products` 里 `featured: true` 且 `order` 最小的两个商品；第 3 屏仍是联系方式
- **`/productos/`**：所有上架商品的卡片网格，运营新增的商品自动出现在这里
- **`/p/<slug>/`**：单个商品的完整页面（图、卖点、价格、Buy Now、联系方式）

这样运营新增第 3、4 个商品时，首页不用改，列表页自动多出卡片。

### 详情页结构（组件拼装）

```
<Base>
  <ProductHero    product={entry} />     图 + 标题 + 副标题 + 价格 + Buy Now
  <BulletList     items={bullets} />     打勾列表
  <ProductBody    content={rendered} />  Markdown 正文（可选）
  <Gallery        images={gallery} />    图集（可选，默认隐藏）
  <ContactBlock   site={site} />         二维码 + 电话 + 营业时间
  <Footer />
</Base>
```

---

## 六、组件化 / 模块化

### 6.1 组件分层

```
src/components/
  layout/    Base.astro · Header.astro · Footer.astro
  ui/        Button.astro · Kickler.astro · BulletList.astro · Card.astro
  sections/  Hero.astro · ProductHero.astro · ProductGrid.astro
             ProductBody.astro · Gallery.astro · ContactBlock.astro
```

`sections/` 里的每个组件就是一个「模块」。新增一类页面区块 = 新增一个 `.astro` 文件 +
在页面里引用一次，不影响其它页面。

### 6.2 运营侧不直接拼模块

完全自由的拖拽装配对非技术运营太危险（很容易拼出难看的页面）。
折中方案：**模板预设 + 开关**。

```yaml
template: product          # product | promo | plain
showGallery: true
showBody: true
showContact: true
```

- 90% 的商品用 `product` 模板，零配置
- 特殊情况用 `promo`（大图 + 一句文案 + 按钮）或 `plain`（纯图文）

> 如果以后真的要自由拼装，把 `sections:` 数组加进 schema 即可，是个增量改动，不推翻现有结构。

---

## 七、构建与部署

### 7.1 依赖与脚本

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "astro": "^7.1.0",
    "@astrojs/sitemap": "^3"
  }
}
```

Node 版本：Astro 7 要求 **Node ≥ 22.23.4**，Workers Builds 的环境变量里要指定（`NODE_VERSION=22`）。

### 7.2 wrangler.jsonc 的变化

```jsonc
{
  "name": "mexico-web",
  "main": "src/worker.js",
  "compatibility_date": "2025-10-01",
  "vars": { "GITHUB_CLIENT_ID": "Ov23liqwCm3Qfwryj8Yt" },
  "keep_vars": true,
  "assets": {
    "directory": "./dist",              // ← 从 "." 改成 "./dist"
    "binding": "ASSETS",
    "run_worker_first": ["/admin/config.yml"]   // ← 只保留这一条
  }
}
```

`/` 和 `/index.html` 不用再经过 Worker——Astro 构建出来的 HTML 里 SEO 标签已经是正确的，
`src/worker.js` 里那段 `applySeo()` 可以整段删除。

### 7.3 目录形态

Astro 只把 `public/` 和构建产物放进 `dist/`，所以：

- `admin/index.html` → 挪到 `public/admin/index.html`
- `admin/config.yml` → 挪到 `public/admin/config.yml`（内容里的 `__ORIGIN__` 保留，Worker 照旧替换）
- `_headers`、`robots.txt` → 挪到 `public/`
- `assets/img/*` → 挪到 `public/uploads/`（运营上传也进这里）
- 现在的 `index.html`、`assets/css/style.css`、`assets/js/*` 变成 Astro 的 `src/` 模板与样式，构建后不再出现在源码里

### 7.4 Cloudflare Workers Builds 配置

| 配置项 | 值 |
|---|---|
| Build command | `npm ci && npm run build` |
| Deploy command | `npx wrangler deploy` |
| 环境变量 | `NODE_VERSION=22` |

**构建失败时 Cloudflare 不会替换现有版本**，线上保持上一版——这是我们的兜底。

### 7.5 缓存头

Astro 输出的资源带 hash（`/_astro/style.abc123.css`），可以放心长缓存：

```
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/uploads/*
  Cache-Control: public, max-age=31536000, immutable

/admin/*
  Cache-Control: no-store, must-revalidate
  X-Robots-Tag: noindex, nofollow

/*.html
  Cache-Control: public, max-age=0, must-revalidate
```

以后改样式不用再手动递增 `?v=3`——hash 变了 URL 就变了。

---

## 八、Decap CMS 配置改造

从「单文件集合」升级为「文件夹集合」，运营才能新增条目。

```yaml
collections:
  - name: products
    label: 商品
    label_singular: 商品
    folder: src/content/products
    create: true
    extension: md
    format: frontmatter
    identifier_field: title
    slug: '{{fields.slug}}'          # 用「URL 名称」字段，避免中文标题进 URL
    summary: '{{title}} · {{order}}'

    fields:
      - { label: 商品名称, name: title, widget: string }
      - { label: URL 名称（英文）, name: slug, widget: string, hint: "只能小写字母、数字、连字符，例如 funda-iphone-18-pro" }
      - { label: 小标题, name: kicker, widget: string }
      - { label: 副标题, name: subtitle, widget: text }
      - { label: 主图, name: cover, widget: image }
      - { label: 主图说明, name: coverAlt, widget: string }
      - { label: 卖点, name: bullets, widget: list, field: { label: 一条卖点, name: text, widget: string } }
      - { label: 价格, name: price, widget: number, required: false }
      - { label: 货币, name: currency, widget: string, default: MXN }
      - { label: 购买链接, name: buyLink, widget: string }
      - { label: 按钮文字, name: buyLabel, widget: string, default: Buy Now }
      - { label: 排序（小的在前）, name: order, widget: number, default: 100 }
      - { label: 首页展示, name: featured, widget: boolean, default: false }
      - { label: 暂不发布, name: draft, widget: boolean, default: false }
      - label: 搜索引擎信息
        name: seo
        widget: object
        collapsed: true
        fields:
          - { label: 网页标题, name: title, widget: string, required: false }
          - { label: 网页描述, name: description, widget: text }
          - { label: 分享图片, name: ogImage, widget: image, required: false }

      - label: 页面模板
        name: template
        widget: select
        options: [product, promo, plain]
        default: product
      - { label: 显示图集, name: showGallery, widget: boolean, default: false }
      - { label: 显示正文, name: showBody, widget: boolean, default: true }
      - { label: 显示联系方式, name: showContact, widget: boolean, default: true }
```

原有的 `site` 集合（首页文案、联系方式）改成指向 `src/content/site/settings.json`，字段基本不变。

---

## 九、图片策略

| 方案 | 做法 | 优点 | 缺点 |
|---|---|---|---|
| **A（推荐先做）** | Decap 上传到 `public/uploads/`，页面用 `<img>` | 简单可靠，路径稳定，运营零学习成本 | 不做压缩/转 webp |
| B（后续可加） | 上传到 `src/assets/products/`，用 `astro:assets` 的 `image()` | 自动转 webp、自动 srcset、LCP 更好 | Decap 写的是绝对路径，和 `image()` 的相对路径要求冲突，要写自定义字段或后处理 |

建议：**先 A，跑通运营流程后再考虑 B**。真要优化，可以加一个构建后脚本把 `/uploads/*.png` 批量转 webp（不改变运营的拍摄/上传习惯）。

另外在 schema 里给 `cover` 一个默认占位图，运营忘传图时页面不会裂。

---

## 十、分阶段实施

每个阶段都能独立上线，出问题可停在任意阶段。

### Phase 0 · 准备（0.5 天）

- 新建分支 `astro`，不直接动 main
- 加 `package.json`、`astro.config.mjs`（`site: 'https://f-lexin.com'`、`@astrojs/sitemap`）
- `<html>` 的语言、字体、favicon 从现有 `index.html` 搬过来

### Phase 1 · 像素复刻（0.5～1 天）

- 把现有三屏页面改写成 `src/pages/index.astro` + 一个 `Base.astro`
- 样式把 `assets/css/style.css` 原样引入，先不拆分
- 内容仍从一个 JSON 读
- **验收**：构建产物和现在的线上页面截图逐屏对比，一致

### Phase 2 · 组件化 + 内容集合（1 天）

- 拆出 `sections/` 组件
- 建 `products` / `site` 集合，把现有文案迁进去
- 首页改为读集合
- **验收**：`npm run build` 通过，页面和 Phase 1 一致

### Phase 3 · 商品列表 + 详情页（1 天）

- `/productos/`、`/p/[slug]/`、`404`
- 运营先手动建 2 个 md 文件测试
- **验收**：手写一个商品 md → 构建 → 两个页面都正确

### Phase 4 · 后台改造（0.5 天）

- Decap 配置改 `folder` 集合 + slug 规则
- admin 页面挪到 `public/admin/`
- **验收**：运营在后台新建商品 → 发布 → 3 分钟内 `/p/<slug>/` 上线

### Phase 5 · 收尾（0.5 天）

- sitemap、robots、`_headers` 更新
- 删掉 `src/worker.js` 里的 SEO 注入逻辑
- 用 `npx wrangler dev` 本地验证 Worker + dist 组合
- 线上验收：首页、列表、详情、后台登录、404

**总计 3～4 个工作日**（含自测），不含运营培训。

---

## 十一、风险与对策

| 风险 | 影响 | 对策 |
|---|---|---|
| 构建失败 | 运营发布后线上没变化，看不到原因 | ① schema 字段尽量给 default；② 部署前本地 `npm run build` 自检；③ 在 README 写「发布后 5 分钟没变化 = 构建失败，找开发看日志」 |
| 运营填了中文 slug | URL 变成 `%E6%89%8B%E6%9C%BA...` | `slug` 是独立必填字段 + 前台校验（hint 写明要求）；构建时 `console.warn` 提示 |
| 图片太大 | 首屏慢 | 上传规范写进后台 hint（≤ 200KB / 1200×1600）；后续加 webp 转换 |
| 两个运营同时建同名商品 | 文件冲突 | Decap 写文件时 GitHub 会报冲突并提示重试；建同名概率极低 |
| 有人直接改 md 写错 YAML | 整站构建失败 | CI 在 PR 上跑 `npm run build`；main 上仍靠 schema 兜底 |
| 旧的三个页面 URL 失效 | 外部链接 404 | 详情页用 `/p/<slug>/`；如果已有外链指向 `/`，首页不变，没影响 |

---

## 十二、需要你拍板的 4 件事

1. **首页怎么办？**
   - （推荐）保持三屏品牌页，另外新增 `/productos/` 列表页
   - 或者首页直接改成商品列表

2. **加商品是不是都要新页面？**
   - （推荐）每个商品一个独立页 + 列表页
   - 还是只在首页多一张卡片、不单独建页

3. **图片要不要上 `astro:assets` 自动压缩？**
   - （推荐）先不做，`public/uploads` + `<img>`，流程最稳
   - 要的话会多 0.5 天，且图片上传方式要跟着调整

4. **要不要「草稿 → 审核 → 发布」流程？**
   - 现在是发布即上线。如果运营不止一个人，建议开 Decap 的
     `publish_mode: editorial_workflow`（保存为 PR，合并后才生效），多 0.5 天

---

## 附：目标文件结构

```
├── astro.config.mjs
├── package.json
├── wrangler.jsonc              # assets.directory = "./dist"
├── src/
│   ├── worker.js               # OAuth + config.yml（删掉 SEO 注入）
│   ├── content.config.ts
│   ├── config/site.ts          # 站点常量（域名、默认 SEO）
│   ├── content/
│   │   ├── products/*.md
│   │   └── site/settings.json
│   ├── layouts/Base.astro
│   ├── components/{layout,ui,sections}/*.astro
│   ├── styles/global.css
│   └── pages/
│       ├── index.astro
│       ├── productos/index.astro
│       ├── p/[slug].astro
│       └── 404.astro
├── public/
│   ├── admin/{index.html,config.yml}
│   ├── uploads/
│   ├── _headers
│   └── robots.txt
└── dist/                       # 构建产物，.gitignore
```
