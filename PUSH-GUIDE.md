# 代码推送说明（给协作成员）

> 如果你只是**改文案、换图片、改电话**，不需要看这份文档 —— 直接打开
> <https://f-lexin.com/admin/> 用后台改就行，后台会自己提交。
>
> 这份文档是给**需要改代码**（HTML / CSS / JS / 配置）的协作成员看的。

---

## 0. 先分清两条路

| 你要做的事 | 用什么方式 |
|---|---|
| 改文案、换产品图、改电话 / 营业时间 | 后台 `/admin/`，点 Publish |
| 改页面结构、样式、脚本、配置 | git 推送（本文档） |

两条路最后都写进同一个仓库、触发同一次自动部署。**互不冲突**，但同一个人不要两头同时改同一屏。

---

## 1. 第一次准备（只做一次）

前提：管理员已经把你加成仓库的 Collaborator，并且你点过邀请邮件里的 **Accept**。

1. 装 Git：<https://git-scm.com/downloads>（Windows 装 Git for Windows，会带 Git Bash）
2. 克隆到**你自己的目录**（不要用别人的工作目录、不要共用一台机器上的同一个文件夹）：

```bash
git clone https://github.com/AAAAmoyuan/Mexico_web.git
cd Mexico_web
```

3. 确认能连上 GitHub：

```bash
git remote -v
```

首次推送会弹出浏览器让你登录 GitHub，授权一次，之后会记住。

---

## 2. 每次动手前：先同步

```bash
git pull --rebase
```

一定要带 `--rebase`：

- 历史保持一条直线，好排查
- 你本地的提交会被「接在」别人最新的提交后面
- 不会产生 `Merge branch 'main'...` 这种噪声提交

---

## 3. 改 → 提交 → 推

```bash
git status                 # 看哪些文件改了
git diff                   # 看具体改了什么（重要，别提交误改）
git add -A
git commit -m "一句话说明改了什么"
git push
```

推送成功后**自动部署**：Cloudflare Workers 收到 main 分支更新 → 构建 → 发布，通常 1～2 分钟。**不需要登录 Cloudflare 手动操作。**

---

## 4. 三条硬规矩（为了不打断其他人）

### ① 不要 force push

```bash
git push --force          # ❌ 禁止
git push --force-with-lease   # ❌ 同样不要对 main 用
```

强推会改写历史，其他人的本地仓库立刻分叉、后续推送全部失败，**包括管理员的**。

### ② 不要删别人的提交

用 `git reset --hard` 再强推 = 把别人的工作抹掉。

要撤销**自己**的改动，用：

```bash
git revert <提交号>       # ✅ 新增一条反向提交，安全、可追溯
```

### ③ 不要动这几个共用配置

| 东西 | 为什么不能动 |
|---|---|
| `wrangler.jsonc` 里的 `vars.GITHUB_CLIENT_ID` | 删了后台所有人登录失败 |
| Cloudflare 后台的变量、域名、构建配置 | 全局生效，改错整站下线 |
| GitHub OAuth App 的回调地址 | 改了后台登录直接报错 |

需要改先找管理员，别自己动。

---

## 5. 推送被拒绝怎么办

看到这个：

```
! [rejected]  main -> main (fetch first)
```

意思是**你推送之前有人先推了**。这是保护机制，不是报错。

✅ 正确做法：

```bash
git pull --rebase
git push
```

❌ 不要 `git push --force` 硬顶。

### 如果 pull 时提示冲突

```bash
git status
```

会把冲突文件列在 `both modified:` 下面。打开这些文件，会看到：

```
<<<<<<< HEAD
别人的内容
=======
你的内容
>>>>>>> 你的提交
```

手工改成最终想要的样子，**删掉这三行标记**，然后：

```bash
git add <冲突文件>
git rebase --continue
git push
```

拿不准就回退到动手前的状态：

```bash
git rebase --abort
```

然后找管理员一起看。

---

## 6. 推完自己验一下

| 检查什么 | 怎么查 |
|---|---|
| 部署成功 | Cloudflare → Workers & Pages → `mexico-web` → 部署，最新一条状态是「成功」 |
| 线上生效 | 打开 <https://f-lexin.com/> ，按 `Ctrl + F5` 强制刷新 |
| 后台没坏 | 打开 <https://f-lexin.com/admin/> ，能正常登录 |

---

## 7. 想大幅改版怎么办

改骨架（结构、排版）影响面大，**别直接推 main**。开分支 + PR：

```bash
git checkout -b redesign-xxx
# ...改...
git push -u origin redesign-xxx
```

然后在 GitHub 上点 **Compare & pull request**，说明改了什么，等确认后再合并。
这样 main 上其他人正在用的版本不会被打断。

---

## 8. 常见问题

**Q：我推代码会不会把别人在后台改的内容冲掉？**
不会。后台改的是 `content/site.json`，代码改动通常是 `index.html` / `assets/css/style.css`，一般是不同文件。真撞上同一个文件，按第 5 节解决。

**Q：我直接改 `content/site.json` 可以吗？**
技术上可以，但**不建议**。后台有表单和校验；手改 JSON 多一个逗号就会导致整页文案不显示。要改内容就用后台。

**Q：推送要输密码吗？**
不用。首次推送会弹出浏览器登录 GitHub，授权一次即可。

**Q：连不上 github.com 怎么办？**
可能需要代理。代理是**个人网络设置**，配在你自己的机器上，不要改别人电脑上的配置：

```bash
git config --global http.https://github.com.proxy http://127.0.0.1:端口
```

**Q：部署一直「进行中」？**
通常 40 秒～2 分钟。超过 5 分钟点进去看构建日志，失败的话把报错发给管理员。

---

## 速查

```bash
git pull --rebase              # 同步别人的改动
git status                     # 看改了啥
git add -A && git commit -m "..."  # 提交
git push                       # 推送（别加 --force）
git revert <提交号>            # 撤销自己的改动（安全）
git rebase --abort             # 冲突搞不定时回退
```
