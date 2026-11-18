/**
 * /api/callback — GitHub 授权完成后回跳的地址。
 *
 * 用 code 换 access_token，再把 token 通过 postMessage 交给 /admin 页面里的 Decap CMS。
 * 需要环境变量 GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET。
 * GitHub OAuth App 的 "Authorization callback URL" 要填：
 *   https://你的域名/api/callback
 */

const jsonForScript = (value) =>
  JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");

function page(body) {
  return new Response(
    `<!doctype html>
<html lang="zh-Hans">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex" />
    <title>授权中…</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center;
             font: 15px/1.6 -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
             background: #160b10; color: #f6ecef; padding: 32px; text-align: center; }
      code { background: #ffffff14; padding: 2px 6px; border-radius: 4px; }
      a { color: #ff7500; }
    </style>
  </head>
  <body>${body}</body>
</html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Set-Cookie": "decap_oauth_state=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
      },
    }
  );
}

function failure(reason) {
  return page(
    `<div><p>登录失败：${reason}</p>
     <p>请关闭此窗口，回到 <a href="/admin/">/admin/</a> 重新点击「使用 GitHub 登录」。</p></div>`
  );
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookie = request.headers.get("Cookie") || "";
  const saved = cookie.match(/(?:^|;\s*)decap_oauth_state=([^;]+)/);

  if (url.searchParams.get("error")) {
    return failure("GitHub 返回了 " + url.searchParams.get("error"));
  }
  if (!code) {
    return failure("没有收到授权码");
  }
  if (!saved || decodeURIComponent(saved[1]) !== state) {
    return failure("state 校验不通过（可能是链接过期，或 Cookie 被浏览器拦截）");
  }
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return failure("Cloudflare 环境变量 GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET 未配置");
  }

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
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
  const token = tokenData.access_token;

  if (!token) {
    const detail = tokenData.error_description || tokenData.error || tokenResponse.status;
    return failure("换取 access_token 失败（" + detail + "）");
  }

  const payload = jsonForScript(JSON.stringify({ token, provider: "github" }));

  return page(
    `<div>
      <p>授权成功，正在返回编辑器…</p>
      <p>如果没有自动跳转，请手动关闭这个窗口。</p>
    </div>
    <script>
      (function () {
        var payload = ${payload};
        function receiveMessage(message) {
          window.opener.postMessage("authorization:github:success:" + payload, "*");
          window.removeEventListener("message", receiveMessage, false);
        }
        if (!window.opener) {
          document.body.innerHTML = "<p>请从 /admin/ 页面打开编辑器，而不是直接访问这个地址。</p>";
          return;
        }
        window.addEventListener("message", receiveMessage, false);
        window.opener.postMessage("authorizing:github", "*");
      })();
    </script>`
  );
}
