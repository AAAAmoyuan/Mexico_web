# Robin 网站 · 使用说明（不需要懂技术）

这是一个一页三屏的落地页：**第 1 屏手机壳 → 第 2 屏手机膜 → 第 3 屏联系方式**。

你只需要会做两件事：**换图片**、**改图片旁边的文字**。其它文件不要动。

---

## 一、换产品图片（最常用）

### 换哪两张图

| 页面位置 | 文件名（必须一模一样） | 放在哪里 |
|---|---|---|
| 第 1 屏 · 手机壳 | `case-product.png` | `assets/img/` 文件夹里 |
| 第 2 屏 · 手机膜 | `film-product.png` | `assets/img/` 文件夹里 |

### 图片规范（照着准备就行）

| 项目 | 要求 |
|---|---|
| 尺寸 | **1200 × 1600 像素**（竖图，宽:高 = 3:4） |
| 格式 | **PNG**（不要 JPG） |
| 背景 | **透明底**最好；**白底也可以**（版块本来就是白色） |
| 大小 | 最好 **1 MB 以内**（超过 2 MB 打开会变慢） |
| 内容 | 产品**完整、居中**，四周留 5~10% 空白；不要带文字、水印、边框、多余道具 |

> 尺寸/比例差一点也没关系：网站会自动缩放，可能会多一点留白，但**不会把页面弄坏、不会裁掉产品**。

### 换图三步

1. 按上面规范准备好图片，**改名**为 `case-product.png`（或 `film-product.png`）。
2. 打开网站文件夹 → `assets/img/`，把新图片拖进去，弹出提示选 **替换 / 覆盖**。
3. 刷新浏览器页面（Windows 按 **Ctrl + F5** 强制刷新）。

换完第 1 屏的图，就刷新看第 1 屏；换第 2 屏同理。

---

## 二、AI 生图提示词（把原图变成 1200×1600 透明底）

把**这段提示词**和**你的产品原图**一起发给 AI 生图工具（即梦、豆包、ChatGPT、Midjourney 等），让它按规范出图：

```
把这张产品图做成电商主图：去掉背景，改成完全透明底；只保留产品本身，产品完整、居中，四周留出约 8% 的透明空白；输出竖版 3:4、1200×1600 像素；保持产品的颜色、材质、光影和细节不变；不要添加任何文字、水印、阴影、边框或装饰。
```

英文版（国外工具用这段）：

```
Turn this product photo into a transparent-background product image: remove the background completely, keep only the product, fully visible and centered with about 8% empty transparent margin, portrait 3:4 at 1200×1600 px, preserve the exact colors, materials, lighting and details. Do not add text, watermark, shadow, border or decorations.
```

补充说明：

- 如果 AI 工具**做不出透明底**，导出**白色背景**的 1200×1600 PNG 也一样能用（页面版块是白底）。
- 如果导出的尺寸不是正好 1200×1600（比如 1024×1536），也能用，网站会自适应。
- 导出后**一定检查**：产品有没有被裁掉、有没有加奇怪的文字/水印；有问题就重新生成。

---

## 三、改文字

1. 用**记事本**打开 `index.html`（右键文件 → 打开方式 → 记事本）。
2. 按 `Ctrl + F`，搜索 **`[EDIT]`**。
3. 每个 `[EDIT] xxx` 标记的**下面那一行/几行**就是要改的文字，直接改内容。

| 标记 | 对应位置 |
|---|---|
| `[EDIT] case.kicker` | 第 1 屏 小标题（Nueva colección） |
| `[EDIT] case.title` | 第 1 屏 大标题 |
| `[EDIT] case.subtitle` | 第 1 屏 副标题 |
| `[EDIT] case.bullets` | 第 1 屏 三条卖点 |
| `[EDIT] film.kicker` | 第 2 屏 小标题 |
| `[EDIT] film.title` | 第 2 屏 大标题 |
| `[EDIT] film.subtitle` | 第 2 屏 副标题 |
| `[EDIT] film.bullets` | 第 2 屏 三条卖点 |
| `[EDIT] contact.kicker` | 第 3 屏 小标题（Contacto） |
| `[EDIT] contact.phone` | 第 3 屏 电话号码 |
| `[EDIT] contact.hours` | 第 3 屏 营业时间 |
| `[EDIT] contact.cta` | 第 3 屏 拨号按钮文字（英文） |

**注意：**

- 只改 `>` 和 `<` 中间的**文字**，不要删除或改动 `<`、`>` 和英文标签属性。
- 改完点**保存**（编码保持 UTF-8），再刷新浏览器。
- 大标题里的 `<br />` 是**换行**，不要删。

---

## 四、联系方式（第 3 屏）

第三屏改成了「左边二维码 + 右边电话和营业时间」，不再有聊天对话。

- 左边卡片：标题 `Escanea el código` + 二维码 + 网址 `www.f-lexin.com`
- 右边：电话 **+52 55 4855 5196**（点击可直接拨号）、营业时间、`Call Now` 按钮
- 二维码文件：`assets/img/contact-qr.png`（600×600 PNG），扫码打开 `www.f-lexin.com`
- 改电话号码：搜 `[EDIT] contact.phone`，把号码和 `tel:+525548555196` 一起改；营业时间搜 `[EDIT] contact.hours`

---

## 五、常见问题

1. **图片换了没变化？** 检查文件名是否完全一致（大小写也要一样）、是否选了“替换”，然后 `Ctrl + F5` 强制刷新。
2. **图片显示不完整/变形？** 网站不会裁切产品；如果比例差太多会留白，建议严格按 3:4（1200×1600）。
3. **页面加载变慢？** 图片太大，压到 1200×1600、1 MB 以内再上传。
4. **改字后页面错乱？** 只改文字、不动标签；出错就恢复备份。
5. **哪些文件不要动？** `assets/css/style.css`、`assets/js/main.js`、`_headers`、`robots.txt`。
6. **改之前先备份**：把整个网站文件夹复制一份，改坏了可以退回来。

---

## 六、给技术同学

- 本地预览：在本文件夹执行 `python -m http.server 8080`，打开 http://localhost:8080
- 部署 Cloudflare Pages：只上传 **`index.html` + `assets/` + `_headers` + `robots.txt`**
- 结构：三屏 `100svh` + `scroll-snap-type: y mandatory`；图片槽位 `case-product.png` / `film-product.png`（1200×1600，PNG，透明或白底）、`contact-qr.png`（600×600 PNG）
- `_preview/` 是预览截图，上传时可删
- 页面文案西语、按钮英文、品牌 Robin；顶栏只保留品牌（原来的 Learn More 按钮已去掉）；第 3 屏左侧二维码卡片、右侧电话与营业时间
