import { defineConfig } from "astro/config";

// 站点域名：用于生成 canonical / og:url / sitemap 里的绝对地址。
// 换域名时只改这一处（后台 config.yml 里的 __ORIGIN__ 仍是自动的）。
export default defineConfig({
  site: "https://f-lexin.com",
  output: "static",
  build: {
    // 输出 /xxx/index.html，保持现在的 URL 形态
    format: "directory",
  },
  trailingSlash: "ignore",
});
