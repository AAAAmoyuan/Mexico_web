/**
 * /api/auth — Decap CMS 的 GitHub 登录入口。
 *
 * Decap 打开弹窗访问本地址，这里把用户重定向到 GitHub 的授权页。
 * 需要两个 Cloudflare Pages 环境变量：
 *   GITHUB_CLIENT_ID       GitHub OAuth App 的 Client ID
 *   GITHUB_CLIENT_SECRET   GitHub OAuth App 的 Client Secret（请在控制台标记为 Secret）
 */
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);

  const provider = url.searchParams.get("provider") || "github";
  if (provider !== "github") {
    return new Response("Unsupported provider: " + provider, { status: 400 });
  }

  if (!env.GITHUB_CLIENT_ID) {
    return new Response(
      "Missing GITHUB_CLIENT_ID. Add it in Cloudflare Pages > Settings > Variables and Secrets.",
      { status: 500 }
    );
  }

  const redirectUri = new URL("/api/callback", url.origin).toString();
  const state = crypto.randomUUID();

  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("scope", "repo,user");
  authorize.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorize.toString(),
      // state 存在 Cookie 里，回调时比对，防止别人伪造回调地址
      "Set-Cookie": `decap_oauth_state=${state}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
      "Cache-Control": "no-store",
    },
  });
}
