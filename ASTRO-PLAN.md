# Astro 改造 + 后台优化方案（v3）

> 需求确认：
> 1. 首页 → **N 屏叙事**，除最后一屏固定「联系方式」外，每屏都是同一个商品展示模块，可增删排序
> 2. **左右布局由运营每屏自由选择**（不再强制交替）
> 3. **每屏保持占满一屏**（`100svh`，手机上一屏一屏翻）
> 4. **新增「直达尾页」功能**，一键跳到最后的联系方式屏
> 5. 项目整体 Astro 化
> 6. 同时给出**管理后台的优化方案**

---

# 第一部分：站点改造

## 1. 数据结构

一份 `src/content/home.json`，后台编辑的就是它：

```json
{
  "brand": { "name": "YB" },

  "nav": { "jumpLabel": "Contacto" },

  "seo": {
    "title": "Robin · Funda para iPhone 18 Pro y protector de pantalla",
    "description": "Funda MagSafe con protección de cámara y protector de pantalla de cristal templado.",
    "ogImage": "/uploads/case-product.png"
  },

  "screens": [
    {
      "kicker": "Nueva colección",
      "title": "Funda para\niPhone 18 Pro",
      "subtitle": "Diseño transparente con anillo MagSafe, protector de cámara y resistencia a caídas de 3M.",
      "bullets": "Anillo MagSafe con imán N56\nCristal antiamarilleo y botón de cámara preciso\nProtección 360° para cámara, pantalla y esquinas",
      "cta": "Buy Now",
      "link": "https://www.mercadolibre.com.mx/...",
      "image": "/uploads/case-product.png",
      "imageAlt": "Funda Robin color vino para iPhone 18 Pro",
      "layout": "imageRight"
    },
    {
      "kicker": "Protección de pantalla",
      "title": "Protector de\npantalla",
      "subtitle": "Cristal templado de alta transparencia con dureza 9H y cobertura total.",
      "bullets": "Dureza 9H antiarañazos\nTratamiento antihuellas y antiamarilleo\nBordes reforzados y ajuste sin burbujas",
      "cta": "Buy Now",
      "link": "https://www.mercadolibre.com.mx/...",
      "image": "/uploads/film-product.png",
      "imageAlt": "Protector de pantalla Robin de cristal templado",
      "layout": "imageLeft"
    }
  ],

  "contact": {
    "kicker": "Contacto",
    "phone": "+52 55 4855 5196",
    "hours": "Atención de lunes a viernes\n9:00 – 18:00",
    "cta": "Call Now",
    "qrTitle": "Escanea el código",
    "qrImage": "/uploads/contact-qr.png",
    "qrAlt": "Código QR de contacto de Robin",
    "website": " ",
    "legal": "Robin · Apple e iPhone son marcas registradas de Apple Inc."
  }
}
```

三个要点：

- **`layout` 三选一**：`imageRight`（文左图右）/ `imageLeft`（图左文右）/ `auto`（按序号交替）。
  每屏独立设置，运营想全做成「文左图右」也行，想交替也行。
- **`contact` 独立对象**，不在 `screens` 数组里 —— 保证它永远是最后一屏、删不掉、拖不走。
- **多行文本用「一行一条」**（`title` / `bullets` / `hours`），构建时按 `\n` 拆。
  这套后台已经在用，运营不用重新学。

## 2. 页面实现

### `src/pages/index.astro`

```astro
---
import Base from '../layouts/Base.astro';
import Topbar from '../components/Topbar.astro';
import ProductScreen from '../components/ProductScreen.astro';
import ContactScreen from '../components/ContactScreen.astro';
import home from '../content/home.json';

const { brand, nav, seo, screens = [], contact } = home;

const isReverse = (i, layout) =>
  layout === 'imageLeft' ? true : layout === 'imageRight' ? false : i % 2 === 1;
---
<Base title={seo.title} description={seo.description} ogImage={seo.ogImage}>
  <a class="skip" href="#contact">Ir al contenido</a>

  <!-- 顶栏右侧新增「直达尾页」按钮 -->
  <Topbar brand={brand} jumpLabel={nav.jumpLabel} />

  <main class="scroller" id="scroller">
    {screens.map((screen, i) => (
      <ProductScreen screen={screen} index={i} reverse={isReverse(i, screen.layout)} />
    ))}
    <ContactScreen data={contact} />
  </main>
</Base>
```

N 屏的真相就是这一行 `screens.map()`：数组几项就渲染几屏，后台加一项，构建就多一节。

### `src/components/ProductScreen.astro`

结构完全沿用现在的 `.screen > .wrap.grid > .copy + .figure`：

```astro
---
const { screen, index, reverse = false } = Astro.props;
const lines = String(screen.title ?? '').split('\n');
const bullets = String(screen.bullets ?? '').split('\n').filter(Boolean);
---
<section class="screen screen-product" id={`screen-${index + 1}`}>
  <div class={`wrap grid${reverse ? ' grid-reverse' : ''}`}>
    {reverse && <Figure {...screen} eager={index === 0} />}

    <div class="copy" data-anim>
      <p class="kicker">{screen.kicker}</p>
      <h1>{lines.map((l, i) => (<>{l}{i < lines.length - 1 && <br />}</>))}</h1>
      <p class="sub">{screen.subtitle}</p>
      {bullets.length > 0 && <ul class="checks">{bullets.map((b) => <li>{b}</li>)}</ul>}
      {screen.link && (
        <a class="btn" href={screen.link} target="_blank" rel="noopener">{screen.cta}</a>
      )}
    </div>

    {!reverse && <Figure {...screen} eager={index === 0} />}
  </div>
  <div class="scroll-hint" aria-hidden="true"><span></span>Desliza</div>
</section>
```

`Figure` 是文件内的局部组件：`.figure > .slot > img`，第一屏 `fetchpriority="high"`，其余 `loading="lazy"`。

## 3. 新增交互：直达尾页

顶栏右侧加一个按钮，点击平滑滚到最后一屏（联系方式）。

```astro
<!-- src/components/Topbar.astro -->
<header class="topbar" id="topbar">
  <a class="brand" href="#screen-1" aria-label={brand.name}>
    <span class="brand-mark" aria-hidden="true"></span>
    <span class="brand-name">{brand.name}</span>
  </a>

  {jumpLabel && (
    <a class="btn-ghost" href="#contact" data-scroll>{jumpLabel}</a>
  )}
</header>
```

**不用写新 JS** —— 现在的 `main.js` 里已经有 `[data-scroll]` 的处理（0.2 版本留下的，一直在）：

```js
document.querySelectorAll("[data-scroll]").forEach((trigger) => {
  trigger.addEventListener("click", (e) => {
    const target = document.querySelector(trigger.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});
```

因为滚动容器是 `.scroller`（不是 window），`scrollIntoView` 会自动滚到正确的容器位置。

CSS 上 `.btn-ghost` 在 0.2.1 里还留着（只是没元素用它），直接复用：

```css
.btn-ghost { padding: 10px 22px; border: 1.5px solid var(--ink); border-radius: 999px; }
.btn-ghost:hover { background: var(--ink); color: #fff; }
```

可选增强（不做也行）：

- 到最后一屏时把按钮淡出（`main.js` 里加个 IntersectionObserver）
- 移动端把按钮缩成图标，避免挤掉品牌名

## 4. CSS 改动（很小）

```css
/* 原来 */
.screen-case, .screen-film { background: var(--white); }
/* 之后 */
.screen-product { background: var(--white); }
```

其余不动 —— `.scroller` 已经是 `height:100svh + scroll-snap-type:y mandatory`，
`.screen` 是 `height:100svh + scroll-snap-align:start`，**N 屏天然支持，保持一屏占满**。

## 5. Astro 化范围

| 现在 | 之后 |
|---|---|
| `index.html` | `src/pages/index.astro` + `src/components/*.astro` |
| `content/site.json` + `assets/js/content.js`（运行时填充） | `src/content/home.json`（**构建时读入，content.js 删除**） |
| 满页 `data-cms` 标记 | 全部删除 |
| `assets/css/style.css` | `src/styles/global.css` |
| `assets/js/main.js` | `src/scripts/main.js`（滚动/入场动画照旧） |
| `assets/img/*` | `public/uploads/*` |
| `admin/` | `public/admin/` |
| `src/worker.js` | 保留 OAuth + `config.yml` 域名替换；**删掉 `applySeo()`** |
| `wrangler.jsonc` | `assets.directory: "./dist"`，`run_worker_first` 只留 `/admin/config.yml` |

SEO 顺带变简单：构建时把 `<title>` / `og:*` 写死在 HTML 里，分享卡片和搜索结果都正确，不再靠运行时补丁。

---

# 第二部分：管理后台优化方案

## B1. 内容结构：一个文件、两块

```
首页
├─ 商品展示屏        [+ 添加] [☰ 拖拽排序]
│   ├─ 屏 1   小标题 / 大标题 / 副标题 / 卖点 / 按钮 / 图 / 左右布局
│   └─ 屏 2   ...
├─ 联系方式（最后一屏）   固定，不可删
├─ 品牌与导航
└─ 搜索引擎信息（标题 / 描述 / 分享图）
```

比现在的「品牌 / SEO / 第1屏 / 第2屏 / 第3屏」五个平级分组更贴近运营的心智：
**「加一屏商品」是一个动作，不是「再配一个分组」**。

## B2. 预览策略：关掉预览面板，改用「部署预览」

**这是必须说清楚的一个坑**：Decap 右侧的预览面板加载的是**已部署的线上页面**，
不是正在编辑的内容。所以运营改完在预览里看不到变化，会以为没生效。

两个选择：

| 方案 | 做法 | 成本 |
|---|---|---|
| **A（推荐）** | `editor.preview: false` 关掉预览面板，发布后 1～2 分钟看线上 | 一行配置 |
| B | 自定义 preview template（React 组件重写页面） | 1～2 天，且与 Astro 模板重复维护 |

选 A。同时在后台字段 hint 里写明「改完点 Publish，等 1～2 分钟刷新官网」。

## B3. 图片自动化：让运营直接传手机原图（收益最大的一步）

Decap 3.x 内置 `media_processing`，上传时在浏览器里转码/压缩，**不需要构建脚本**：

```yaml
media_folder: "public/uploads"
public_folder: "/uploads"

media_processing:
  enabled: true
  format:
    enabled: true
    default: webp      # 统一转 webp
  quality: 82
  strip_metadata: true # 去掉 EXIF（顺带保护隐私）
  width: 1200          # 商品图统一 1200 宽，保持 3:4 比例
  height: null
```

效果：运营传一张 5 MB 的 iPhone 原图 → 自动变成 ~200 KB 的 webp，页面首屏不再被拖慢。

**例外**：二维码不能压缩（压缩后可能扫不出来），在字段上单独覆盖：

```yaml
- label: 二维码图片
  name: qrImage
  widget: image
  media_processing:
    enabled: false
```

## B4. 字段与校验

- **布局**：`select`，三选一（文左图右 / 图左文右 / 自动交替），每屏独立
- **必填**：只有「大标题」和「产品图」必填，其余给默认值，避免运营漏填导致构建失败
- **校验**：电话字段加 `pattern`，格式不对当场提示
- **提示文案**：图片规格、推荐屏数（2～5 屏）、按钮链接从哪里拿
- **注意**：官方文档写明字段的 `default` **只对 folder collection 生效**，我们的 `home` 是 file collection，
  所以默认值要在 JSON 里写全，不能指望 `default` 兜底（这是 Astro 改造时要一并处理的）

## B5. 发布流程与权限（多人协作必须做）

现在的问题：**Decap 的 GitHub 后端按仓库写权限控制**。给运营写权限 = 他也能改代码、能直接推 main。

推荐组合：

1. **`publish_mode: editorial_workflow`**
   运营点「保存」→ 生成一个草稿分支和 PR，状态是 `Draft` / `In Review`，
   再点「发布」才会合并到 main。改错了可以丢弃草稿。
2. **GitHub 分支保护**（Settings → Rules / Branch protection）
   `main` 要求 PR 才能合并，禁止直接 push、禁止 force push。
   → 运营（哪怕有写权限）也只能走 PR 流程，不会误伤线上。
3. **Workers Builds 的预览部署**
   非 main 分支会自动得到预览 URL，运营在合并前能直接看效果。
   这是对 B2「关掉预览面板」的补偿。

代价：运营多两步操作（提交审核 → 发布）。如果只有一个运营、且信任度高，可以先不上，
留一个开关随时打开。

## B6. 提交信息与审计

**发现一个现存 bug**：`commit_messages` 放错位置了 —— 官方文档要求它挂在 **`backend:`** 下面，
我们现在写在了顶层，所以一直没生效（GitHub 上的提交还是英文默认的 `Update 页面 "home"`）。

修正后：

```yaml
backend:
  name: github
  repo: AAAAmoyuan/Mexico_web
  branch: main
  base_url: __ORIGIN__
  auth_endpoint: /api/auth

  commit_messages:
    create: "内容：{{author-name}} 新增 {{collection}} {{path}}"
    update: "内容：{{author-name}} 修改 {{collection}} {{path}}"
    delete: "内容：{{author-name}} 删除 {{collection}} {{path}}"
    uploadMedia: "图片：{{author-name}} 上传 {{path}}"
    deleteMedia: "图片：{{author-name}} 删除 {{path}}"
```

这样仓库提交记录里直接看得出「谁改了什么」，出问题能定位到人。
（`author-name` 来自 GitHub 账号，比 login 更可读）

## B7. 让运营知道「到底上线了没有」

现在最大的体验缺口：**发布后要自己数 1～2 分钟，然后刷新确认**，失败了也看不出来。

轻量方案（推荐，0.5 天）：

1. Workers Builds 构建时会注入 `WORKERS_CI_COMMIT_SHA` 环境变量
2. 构建时把它写进页面 `<meta name="deploy" content="abc1234">`
3. 后台 `public/admin/index.html` 加一行小字，用 `fetch('/')` 读这个 meta，显示：
   `线上版本 abc1234 · 构建于 12:03`

运营发布后刷新后台就能看到版本号变了，没变就是构建失败。

更完整的方案（1 天）：Worker 提供 `/api/deploy-status`，读 GitHub Actions / Cloudflare API，
显示「构建中 / 成功 / 失败 + 日志链接」。按需再做。

## B8. 备份与回滚

- **自动备份**：每次发布都是一次 git 提交，本身就是备份
- **回滚**：Cloudflare 控制台 → 部署 → 选择上一个版本 → 回滚（秒级，不用改代码）
- **内容回滚**：`git revert <提交>` 推上去，1～2 分钟生效
- 建议在后台给运营留一条提示：「改坏了找管理员，能回到任意一次发布之前」

## B9. 登录与安全（现状已够，列出待确认项）

| 项 | 现状 |
|---|---|
| OAuth 防伪 | ✅ state 存 HttpOnly Cookie，回调比对 |
| Client Secret 存放 | ✅ Cloudflare Secret，不进仓库 |
| 后台不被收录 | ✅ `_robots` 头 + robots.txt 双重 |
| 会话过期 | Decap 把 token 存在浏览器 localStorage；`Expire user access tokens` **不要勾**（勾了每天要重新登录） |
| 账号共用 | ⚠️ 不要多人共用一个 GitHub 账号，否则提交记录失去意义 |

## B10. 可选升级（以后再说）

| 方案 | 收益 | 成本 |
|---|---|---|
| Sveltia CMS 替代 Decap | 界面更快、移动端更好、兼容 Decap 配置 | 换一个 script 标签，配置几乎不用改，半天试用 |
| Decap Turbo | 多角色权限、活动日志、部署状态 | €19/月起，1 个免费站点 1 席位 |
| 自定义 preview template | 编辑时就能看到效果 | 1～2 天，且要随页面改版同步维护 |

---

# 第三部分：实施计划

| 阶段 | 内容 | 工时 |
|---|---|---|
| **P0** | 开 `astro` 分支、`package.json`、`astro.config.mjs`、目录迁移（`public/`） | 0.5 天 |
| **P1** | 三屏**像素级复刻**（先写死，不循环），和线上截图逐屏对比 | 0.5 天 |
| **P2** | 改成 `screens.map()` 循环 + `layout` 三选一 + 直达尾页按钮 + 删 `content.js` / `data-cms` | 0.5 天 |
| **P3** | Decap 后台改造：列表控件、`commit_messages` 归位、`media_processing`、关预览面板 | 0.5 天 |
| **P4** | `wrangler.jsonc` 切 `dist`、删 Worker 的 SEO 注入、缓存头、`wrangler dev` 联调 | 0.5 天 |
| **P5**（可选） | `editorial_workflow` + 分支保护 + 预览部署 + 版本号显示 | 0.5～1 天 |

**核心 4 阶段（P0～P4）约 2.5 天**，P5 是运营成熟后再上的可选增强。

全程在 `astro` 分支，main 不动；P2 完成后先给你本地看，确认再合并。

---

# 第四部分：风险与对策

| 风险 | 对策 |
|---|---|
| 构建失败 → 运营发布后线上没变化 | Cloudflare 保留上一版，站点不会挂；P5 的版本号显示能让人立刻看出「没上线」 |
| 运营把屏删到 0 | `screens` 为空时渲染一个兜底屏，联系方式仍在 |
| 运营传超大的图 | `media_processing` 自动压到 webp + 1200 宽 |
| 运营改坏布局 | `layout` 只能三选一，选不出花来 |
| 屏数太多页面很长 | 后台 hint 提示「建议 2～5 屏」；每屏仍是一屏高，翻页体验不变 |
| 自定义域名/换域名 | `admin/config.yml` 的 `__ORIGIN__` 机制沿用，不用改 |

---

# 附：目标目录

```
├── astro.config.mjs
├── package.json
├── wrangler.jsonc                 # assets.directory = "./dist"
├── src/
│   ├── worker.js                  # OAuth + config.yml（删 SEO 注入）
│   ├── content/home.json          # ★ 运营编辑的唯一数据源
│   ├── layouts/Base.astro
│   ├── components/
│   │   ├── Topbar.astro           # ★ 含「直达尾页」按钮
│   │   ├── ProductScreen.astro    # ★ N 屏复用模块
│   │   └── ContactScreen.astro    # ★ 固定最后一屏
│   ├── styles/global.css
│   ├── scripts/main.js
│   └── pages/index.astro          # ★ screens.map()
├── public/
│   ├── admin/{index.html,config.yml}
│   ├── uploads/
│   ├── _headers
│   └── robots.txt
└── dist/                          # 构建产物，.gitignore
```
