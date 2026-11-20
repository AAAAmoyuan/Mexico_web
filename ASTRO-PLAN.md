# Astro 改造方案 v2 —— 首页 N 屏叙事

> 需求：首页改成**可自由增减的 N 屏**，除最后一屏固定为「联系方式」外，
> 每一屏都是一个**结构相同的商品展示模块**，由运营在后台增删排序。
> 项目整体 Astro 化。

---

## 一、需求边界

| | |
|---|---|
| ✅ 要 | 首页 N 屏（N ≥ 1）、每屏同结构、末尾固定联系屏、后台可增删排序、Astro 构建 |
| ❌ 不要 | 每个商品一个独立页面、购物车/下单、多语言 |
| 保持不变 | 视觉设计、滚动吸屏（scroll-snap）、顶部品牌条、联系方式区结构 |

**和上一版方案的区别**：不需要 `/p/[slug]/` 动态路由，也不需要 products 集合。
商品数据直接内联在首页配置里，运营在同一个后台页面里拖拽增删屏。

---

## 二、数据结构

一份 `src/content/home.json`，后台编辑的就是它：

```json
{
  "brand": { "name": "YB" },

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
      "layout": "auto"
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
      "layout": "auto"
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

三个设计决定：

1. **`title` / `bullets` / `hours` 用「一行一条」的文本**，构建时按 `\n` 拆开。
   这一套现在的后台已经在用，运营不用重新学；也避开了 Decap 列表控件的不确定性。
2. **`layout: auto | imageRight | imageLeft`** —— `auto` 按序自动左右交替（第 1 屏文左图右、第 2 屏图左文右……），
   需要时运营可单独指定。这样 N 屏的节奏是自动的，不用每屏手调。
3. **`contact` 是独立对象，不在 `screens` 数组里** —— 保证它永远最后、不能被拖走、不能被删。

---

## 三、页面实现

### 3.1 `src/pages/index.astro`

```astro
---
import Base from '../layouts/Base.astro';
import Topbar from '../components/Topbar.astro';
import ProductScreen from '../components/ProductScreen.astro';
import ContactScreen from '../components/ContactScreen.astro';
import home from '../content/home.json';

const { brand, seo, screens = [], contact } = home;

// auto = 按序号左右交替；也允许单屏强制指定
const isReverse = (i, layout) =>
  layout === 'imageLeft' ? true : layout === 'imageRight' ? false : i % 2 === 1;
---
<Base title={seo.title} description={seo.description} ogImage={seo.ogImage}>
  <a class="skip" href="#contact">Ir al contenido</a>
  <Topbar brand={brand} />

  <main class="scroller" id="scroller">
    {screens.map((screen, i) => (
      <ProductScreen screen={screen} index={i} reverse={isReverse(i, screen.layout)} />
    ))}
    <ContactScreen data={contact} />
  </main>
</Base>
```

`src/pages/index.astro` 就是「N 屏」的唯一真相：数组有几项就渲染几屏，
加一屏就是后台点一下「+ 添加」，构建时自动多一节。

### 3.2 `src/components/ProductScreen.astro`

结构完全沿用现在的 `.screen > .wrap.grid > .copy + .figure`：

```astro
---
const { screen, index, reverse = false } = Astro.props;
const lines = String(screen.title ?? '').split('\n');
const bullets = String(screen.bullets ?? '').split('\n').filter(Boolean);
---
<section class="screen screen-product" id={`screen-${index + 1}`}>
  <div class={`wrap grid${reverse ? ' grid-reverse' : ''}`}>
    {reverse && <Figure {...screen} />}

    <div class="copy" data-anim>
      <p class="kicker">{screen.kicker}</p>
      <h1>{lines.map((line, i) => (<>{line}{i < lines.length - 1 && <br />}</>))}</h1>
      <p class="sub">{screen.subtitle}</p>
      {bullets.length > 0 && (
        <ul class="checks">{bullets.map((b) => <li>{b}</li>)}</ul>
      )}
      {screen.link && (
        <a class="btn" href={screen.link} target="_blank" rel="noopener">{screen.cta}</a>
      )}
    </div>

    {!reverse && <Figure {...screen} />}
  </div>
  <div class="scroll-hint" aria-hidden="true"><span></span>Desliza</div>
</section>
```

`<Figure>` 就是 `.figure > .slot > img`，第一屏加 `fetchpriority="high"`，其余 `loading="lazy"`。

### 3.3 `ContactScreen.astro`

直接搬 0.2.1 的第 3 屏（`.screen.screen-contact` + `.qr-card` + `.contact-info`），
数据从 `contact` 对象读。

### 3.4 CSS 改动（很小）

```css
/* 原来： .screen-case, .screen-film { background: var(--white); } */
/* 改成： */
.screen-product { background: var(--white); }
```

其它不用动 —— `.scroller` 已经是 `height:100svh + scroll-snap-type:y mandatory`，
`.screen` 是 `height:100svh + scroll-snap-align:start`，**N 屏天然支持**。

`.grid-reverse` 也不必改：它就是靠 DOM 顺序 + `direction` 之类实现的，左右交替照常。

> 唯一要留意：屏数多时，`.scroll-hint` 每屏都有，滚动条会变长——属于预期。

---

## 四、后台（Decap）配置

一个文件集合，`screens` 用**列表控件**（自带增删 + 拖拽排序）：

```yaml
collections:
  - name: home
    label: 首页
    files:
      - name: home
        label: 首页内容
        file: src/content/home.json
        format: json
        fields:
          - label: 品牌
            name: brand
            widget: object
            fields:
              - { label: 品牌名, name: name, widget: string }

          - label: 搜索引擎信息
            name: seo
            widget: object
            collapsed: true
            fields:
              - { label: 网页标题, name: title, widget: string }
              - { label: 网页描述, name: description, widget: text }
              - { label: 分享图片, name: ogImage, widget: image }

          - label: 商品展示屏
            name: screens
            widget: list
            label_singular: 一屏
            summary: '{{fields.kicker}} — {{fields.title}}'
            hint: "点「+」加一屏，拖动左侧手柄可以调整顺序；最后一屏联系方式不用管，它永远在最后"
            fields:
              - { label: 小标题, name: kicker, widget: string }
              - { label: 大标题, name: title, widget: text, hint: "需要换行的地方按回车" }
              - { label: 副标题, name: subtitle, widget: text }
              - { label: 卖点, name: bullets, widget: text, hint: "一行一条，显示为打勾列表" }
              - { label: 按钮文字, name: cta, widget: string, default: Buy Now }
              - { label: 按钮链接, name: link, widget: string }
              - { label: 产品图, name: image, widget: image, hint: "1200×1600 PNG，透明底或白底" }
              - { label: 图片说明（alt）, name: imageAlt, widget: string }
              - label: 图文左右
                name: layout
                widget: select
                default: auto
                options:
                  - { label: 自动交替, value: auto }
                  - { label: 文左图右, value: imageRight }
                  - { label: 图左文右, value: imageLeft }

          - label: 联系方式（最后一屏）
            name: contact
            widget: object
            collapsed: true
            fields:
              - { label: 小标题, name: kicker, widget: string }
              - { label: 电话号码, name: phone, widget: string }
              - { label: 营业时间, name: hours, widget: text, hint: "需要换行的地方按回车" }
              - { label: 打电话按钮文字, name: cta, widget: string }
              - { label: 二维码标题, name: qrTitle, widget: string }
              - { label: 二维码图片, name: qrImage, widget: image }
              - { label: 二维码说明（alt）, name: qrAlt, widget: string }
              - { label: 二维码下方文字, name: website, widget: string, hint: "留空则不显示" }
              - { label: 页脚版权, name: legal, widget: string }
```

运营看到的操作：

```
首页
  ├─ 商品展示屏            [+ 添加]   ← 加一屏商品
  │   ├─ ☰ Nueva colección — Funda para iPhone 18 Pro    [删除]
  │   └─ ☰ Protección de pantalla — Protector de pantalla [删除]
  └─ 联系方式（最后一屏）   ← 固定，不可删
```

---

## 五、Astro 化的具体范围

| 现在 | 之后 |
|---|---|
| `index.html`（静态骨架） | `src/pages/index.astro` + `src/components/*.astro` |
| `content/site.json` + `assets/js/content.js`（运行时填充） | `src/content/home.json`（**构建时读入，content.js 删除**） |
| `index.html` 里的 `data-cms` 标记 | 全部删除（不再需要） |
| `assets/css/style.css` | `src/styles/global.css`（内容不变，只改 `.screen-product`） |
| `assets/js/main.js` | `src/scripts/main.js`（滚动手势、入场动画照旧） |
| `assets/img/*` | `public/uploads/*` |
| `admin/` | `public/admin/` |
| `src/worker.js` | 保留 OAuth + `config.yml` 域名替换；**删掉 `applySeo()`**（Astro 构建时就能写对） |
| `wrangler.jsonc` | `assets.directory` 改成 `./dist`，`run_worker_first` 只留 `/admin/config.yml` |

### SEO 反而变简单

Astro 在构建时就把 `<title>` / `description` / `og:*` 写进 HTML，
不再需要 Worker 运行时注入，也不再依赖浏览器 JS——分享卡片和搜索结果都正确。

---

## 六、迁移步骤（每步都可独立上线）

### Phase 0 · 骨架（0.5 天）

- 开分支 `astro`（**不直接动 main**）
- `package.json`、`astro.config.mjs`（`site: 'https://f-lexin.com'`）
- 目录：`src/pages`、`src/components`、`src/content`、`public/`
- `public/` 里放 `admin/`、`_headers`、`robots.txt`、`uploads/`

### Phase 1 · 复刻当前两屏（0.5 天）

- 把 0.2.1 的 3 屏原样写成 Astro 组件（先写死两个商品，不用循环）
- **验收**：`npm run build` 后 `dist/` 本地起服务，和线上截图逐屏对比一致

### Phase 2 · 数组化（0.5 天）

- 引入 `src/content/home.json` + `screens.map()` 循环
- 删除 `content.js` 与所有 `data-cms`
- **验收**：JSON 里加/删一屏，构建产物跟着变

### Phase 3 · 后台与收尾（0.5 天）

- Decap 配置改列表控件，指向 `src/content/home.json`
- `wrangler.jsonc` 切到 `./dist`，Worker 删 SEO 注入
- 缓存头、`npx wrangler dev` 本地联调
- **验收**：后台加一屏 → 发布 → 线上出现新屏

**合计 2 个工作日**（含自测）。

---

## 七、风险与对策

| 风险 | 对策 |
|---|---|
| 构建失败 → 运营发布后线上没变化 | Cloudflare 保留上一版，站点不会挂；schema 全给 default；README 写明「5 分钟没变化=构建失败」 |
| 运营加了很多屏 → 页面很长、加载慢 | 首屏 `fetchpriority=high`，其余 `loading=lazy`；后台 hint 提示「建议 2～5 屏」 |
| 删到只剩 0 屏 | `screens` 为空时渲染一个兜底欢迎屏，contact 仍在 |
| 图片路径写错 | `image` 给默认占位图；构建时 `console.warn` 缺失文件 |
| 迁移期间线上版本 | 全程在 `astro` 分支，main 不动；合并前用 `wrangler dev` + 本地截图对比 |

---

## 八、目标目录

```
├── astro.config.mjs
├── package.json
├── wrangler.jsonc                 # assets.directory = "./dist"
├── src/
│   ├── worker.js                  # OAuth + config.yml（删 SEO 注入）
│   ├── content/home.json          # ★ 运营编辑的唯一数据源
│   ├── layouts/Base.astro
│   ├── components/
│   │   ├── Topbar.astro
│   │   ├── ProductScreen.astro    # ★ N 屏复用的模块
│   │   └── ContactScreen.astro    # ★ 固定最后一屏
│   ├── styles/global.css
│   ├── scripts/main.js
│   └── pages/index.astro          # ★ screens.map() 的地方
├── public/
│   ├── admin/{index.html,config.yml}
│   ├── uploads/
│   ├── _headers
│   └── robots.txt
└── dist/                          # 构建产物，.gitignore
```

---

## 九、需要你确认的两点

1. **屏的左右交替**默认按序号自动（`auto`），你要不要保持这个默认？
   （也可以改成默认都「文左图右」，需要时再手动指定）
2. **每屏要不要固定高度占满一屏**（现在是 `100svh`）？
   屏数多了以后，手机上一屏一屏翻是设计初衷；如果你希望内容多时可以自然滚动，就要改成 `min-height`。

确认这两点后我就可以开工 —— 建议先做 Phase 0/1 给你看复刻效果，确认无差异再往下。
