# Cloudflare 静态站 — JUESHITUO 手机壳落地页

单页静态站（纯 HTML/CSS/JS，无构建步骤），部署在 Cloudflare Workers 静态资源上，
并带一个 Decap CMS 后台供不懂代码的同事维护文案。

## 目录

```
index.html              页面结构（文案已改为可被后台覆盖，默认值仍写在这里）
content/site.json       ★ 所有文案和图片 —— 后台改的就是这个文件
admin/                  Decap CMS 后台（/admin/）
admin/config.yml        后台表单定义（哪个字段对应哪段文字、中文标签）
src/worker.js           Cloudflare Worker：静态资源 + GitHub OAuth 登录代理
wrangler.jsonc          Worker 部署配置（name / main / assets）
.assetsignore           不随站点上传的仓库文件
assets/css/style.css    样式
assets/js/content.js    读取 content/site.json 并填充页面
assets/js/main.js       轮播 / 顶栏 / 入场动画
assets/img/             hero 背景、产品图、卖点图
assets/img/uploads/     后台后台上传的新图片会进这里
_headers                缓存与安全头（Workers 静态资源同样支持）
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

后台在 http://localhost:8080/admin/ 。

## 内容管理后台（Decap CMS）

不懂代码的同事打开 `https://你的域名/admin/`，用 GitHub 账号登录，就能改文字和换图；
保存后会自动提交到仓库，Cloudflare Workers 随后自动重新部署，一两分钟后线上生效。

![后台编辑界面](_preview/cms-admin.png)

### 工作原理

```
/admin/ (Decap CMS)  --OAuth-->  /api/auth · /api/callback (src/worker.js)
        |                                    |
        |  读写 content/site.json            |  换取 GitHub token
        v                                    v
     GitHub 仓库  ---------------------->  GitHub OAuth App
        |
        |  push 触发 Workers Builds
        v
   Cloudflare Worker  ->  线上页面（content.js 用 JSON 填充文案）
```

### 一次性配置（部署后做一次）

1. **Worker 必须连上 GitHub 仓库（Workers Builds）**，否则后台保存后线上不会自动更新。
   - Worker → Settings → Build → Connect，部署命令填 `npx wrangler deploy`，构建命令留空
2. **创建一个 GitHub OAuth App**：https://github.com/settings/applications/new
   - Application name：`Mexico_web CMS`
   - Homepage URL：你的站点地址
   - Authorization callback URL：`https://你的域名/api/callback`
   - 创建后记下 **Client ID**，再 Generate a new client secret 拿到 **Client Secret**
3. **在 Worker 里加环境变量**（Settings → Variables and Secrets）：
   - `GITHUB_CLIENT_ID`（明文）
   - `GITHUB_CLIENT_SECRET`（类型选 Secret）
   - 加完重新部署一次
4. **换自定义域名时**，同步改 `admin/config.yml` 里 `base_url` / `site_url` /
   `display_url` / `logo_url` 四处，以及 OAuth App 的 callback 地址
5. **给编辑者开权限**：GitHub 仓库 → Settings → Collaborators → Add people
   对方需要一个 GitHub 账号，并接受邀请。Decap 的 GitHub 后端是按仓库写权限控制访问的。

### 编辑者怎么用

1. 打开 `https://你的域名/admin/`，点「使用 GitHub 登录」授权
2. 左侧「网站内容 → 首页文案」，右侧按分区修改文字
3. 点右上角 **Publish** 保存，等 1-2 分钟线上生效

### 本地调试后台

```bash
npx decap-server          # 终端 1：本地编辑代理（config.yml 里 local_backend: true）
python -m http.server 8080 # 终端 2
```

打开 http://localhost:8080/admin/ 可直接编辑本地文件，不需要登录。

## 部署到 Cloudflare Workers

线上地址：https://mexico-web.luyonghuang.workers.dev

站点是「Worker + 静态资源」：`wrangler.jsonc` 里的 `main` 是 `src/worker.js`
（负责 `/api/*` 登录代理），`assets.directory` 是仓库根目录（其余文件原样提供）。

**后台要能更新线上，必须走 Git 部署**，否则 CMS 提交了但网站不会重新发布：

1. Cloudflare 控制台 → Workers & Pages → 点 `mexico-web` → Settings → Build
2. Connect 到 `AAAAmoyuan/Mexico_web`，分支 `main`
3. 构建命令留空，部署命令填 `npx wrangler deploy`
4. 保存后点一次 Deploy，之后每次 `git push`（包括后台保存产生的提交）都会自动发布

也可以在本机手动发布：

```bash
npx wrangler login     # 浏览器授权一次
npx wrangler deploy
```

> 直接拖拽上传（Upload assets）会让 `/api/auth` 变成 404 —— 那是只有静态文件、
> 没有 Worker 脚本的部署方式，后台登录不了。

## 图片说明

- `hero-1/2/3`：由 `手机壳/手机壳.webp` 抠图后合成到暗酒红影棚背景，1920×1080；`-mobile` 为 1080×1350 竖版
- `product-cutout`：抠好的产品图（透明背景），用于产品区
- `product-main`：原竖图，用于 MagSafe 区块
- `feature-*.webp`：你提供的 5 张卖点信息图（西语）

替换方法：后台可以直接换产品区和卖点区的图；hero 背景图因为同时有
`webp` / `jpg` / `-mobile` 三套，目前需要替换文件（保持同名、宽高比一致：hero 16:9、mobile 4:5）。

## 需要你改的地方

- **域名**：目前写死 `https://mexico-web.luyonghuang.workers.dev`，换域名时 `admin/config.yml` 四处
  加 OAuth App 的 callback 地址要一起改
- **品牌名 / 购买链接 / 价格文案**：现在都可以在后台改，不用动代码
- **价格**：页面暂未写价格，需要的话我可以加一行 `$XXX MXN` 或划线价

## 备注

- 顶栏导航 / 轮播 / 懒加载 / 响应式均已实现；hero 支持自动轮播、箭头、圆点、手机滑动
- 页面语言为西班牙语（`lang="es"`），卖点图自带西语文案，语言统一
- 首屏轮播固定 3 张、卖点图固定 5 张、兼容性卡片固定 3 张，后台多加的条目不会显示
- 后台改的文字靠 `assets/js/content.js` 覆盖到页面上；JS 加载失败时页面显示 `index.html` 里的默认文案，不会白屏
- Apple / iPhone 为 Apple Inc. 商标，页脚已加免责声明
