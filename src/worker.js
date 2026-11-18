/**
 * Cloudflare Worker —— JUESHITUO 落地页 + Decap CMS 的 GitHub OAuth 代理
 *
 * 为什么需要这个文件：站点部署在 Workers（静态资源），而 Pages Functions
 * 只在 Cloudflare Pages 上运行，Workers 里不会执行。所以把登录代理写成
 * Worker 脚本，静态资源仍然由 assets 提供。
 *
 * 路由：
 *   /api/auth      跳转 GitHub 授权页（Decap 点「使用 GitHub 登录」时打开）
 *   /api/callback  GitHub 回跳，换 access_token 后交还给 /admin/
 *   其它路径        交给静态资源（env.ASSETS）
 *
 * 需要在 Cloudflare 里配置两个变量：
 *   GITHUB_CLIENT_ID        OAuth App 的 Client ID
 *   GITHUB_CLIENT_SECRET    OAuth App 的 Client Secret（类型选 Secret）
 */

const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const TOKEN_URL = "https://github.com/login/oauth/access_token";
const STATE_COOKIE = "decap_oauth_state";

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[ch]);

const jsonForScript = (value) =>
  JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");

function page(body, cookie) {
  const headers = {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  };
  if (cookie) headers["Set-Cookie"] = cookie;

  return new Response(
    `<!doctype html>
<html lang="zh-Hans">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex" />
    <title>授权中…</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center;
             font: 15px/1.7 -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
             background: #160b10; color: #f6ecef; padding: 32px; text-align: center; }
      p { margin: 0 0 8px; }
      a { color: #ff7500; }
    </style>
  </head>
  <body>${body}</body>
</html>`,
    { headers }
  );
}

function failure(reason) {
  return page(
    `<div>
       <p>登录失败：${escapeHtml(reason)}</p>
       <p>请关闭这个窗口，回到 <a href="/admin/">/admin/</a> 重新登录。</p>
     </div>`
  );
}

/** 第一步：把用户送到 GitHub 授权页 */
function handleAuth(url, env) {
  if (!env.GITHUB_CLIENT_ID) {
    return failure("Cloudflare 变量 GITHUB_CLIENT_ID 未配置");
  }

  const state = crypto.randomUUID();
  const authorize = new URL(AUTHORIZE_URL);
  authorize.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", new URL("/api/callback", url.origin).toString());
  authorize.searchParams.set("scope", "repo,user");
  authorize.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorize.toString(),
      // state 存进 Cookie，回调时比对，防止别人伪造回调地址
      "Set-Cookie": `${STATE_COOKIE}=${state}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
      "Cache-Control": "no-store",
    },
  });
}

/** 第二步：GitHub 带 code 回跳，换 token 并交给 Decap */
async function handleCallback(request, url, env) {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookie = request.headers.get("Cookie") || "";
  const saved = cookie.match(/(?:^|;\s*)decap_oauth_state=([^;]+)/);

  if (url.searchParams.get("error")) {
    return failure("GitHub 返回了 " + url.searchParams.get("error"));
  }
  if (!code) return failure("没有收到授权码");
  if (!saved || decodeURIComponent(saved[1]) !== state) {
    return failure("state 校验不通过（链接可能已过期，或浏览器拦截了 Cookie）");
  }
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return failure("Cloudflare 变量 GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET 未配置");
  }

  const tokenResponse = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "decap-cms-oauth-proxy",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: new URL("/api/callback", url.origin).toString(),
    }),
  });

  const tokenData = await tokenResponse.json().catch(() => ({}));
  if (!tokenData.access_token) {
    const detail = tokenData.error_description || tokenData.error || tokenResponse.status;
    return failure("换取 access_token 失败（" + detail + "）");
  }

  const payload = jsonForScript(JSON.stringify({ token: tokenData.access_token }));

  return page(
    `<div>
       <p>授权成功，正在返回编辑器…</p>
       <p>如果没有自动跳转，直接关掉这个窗口即可。</p>
     </div>
     <script>
       (function () {
         var payload = ${payload};
         function receiveMessage() {
           window.opener.postMessage("authorization:github:success:" + payload, "*");
           window.removeEventListener("message", receiveMessage, false);
         }
         if (!window.opener) {
           document.body.innerHTML =
             "<p>请从 /admin/ 页面打开编辑器，而不是直接访问这个地址。</p>";
           return;
         }
         window.addEventListener("message", receiveMessage, false);
         window.opener.postMessage("authorizing:github", "*");
       })();
     </script>`,
    `${STATE_COOKIE}=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/auth" || url.pathname === "/api/callback") {
      if (request.method !== "GET") {
        return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET" } });
      }
      return url.pathname === "/api/auth"
        ? handleAuth(url, env)
        : handleCallback(request, url, env);
    }

    /*
     * Decap 的 config.yml 需要绝对地址，但站点可能同时挂在 workers.dev、
     * 自定义域名、预览域名上。这里把文件里的 __ORIGIN__ 换成当前访问的域名，
     * 换域名就不用再改配置文件了。
     */
    if (url.pathname === "/admin/config.yml") {
      const res = await env.ASSETS.fetch(request);
      if (!res.ok) return res;
      const text = await res.text();
      return new Response(text.split("__ORIGIN__").join(url.origin), {
        headers: {
          "Content-Type": "text/yaml; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
