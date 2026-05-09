# Cloudflare 部署指南

本项目使用 **Cloudflare Pages + _worker.js** 方案部署：
- **前端**：Pages 托管静态文件（HTML/CSS/JS）
- **后端**：`_worker.js` 拦截 API 请求并转发到 dataler.com，保护 API Key 不暴露给前端

团队 10 个人直接通过浏览器访问网址即可使用，无需本地安装 Node.js。

---

## 前置准备

1. 注册 Cloudflare 账号：https://dash.cloudflare.com/sign-up
2. 确保项目目录下已安装 wrangler：
   ```bash
   cd "C:\Users\21255\Desktop\QW工作空间\qoderwork-web"
   npm install
   ```

---

## 第一步：登录 Cloudflare

```bash
npx wrangler whoami
```

如果显示未登录，执行：

```bash
npx wrangler login
```

会自动打开浏览器授权，点击允许即可。

---

## 第二步：设置密钥（API Key 不暴露到前端）

```bash
# 设置 dataler.com 中转站的 API Key（必填）
npx wrangler pages secret put DATALER_API_KEY --project-name=qoderwork-web

# 设置中转站地址（默认 https://dataler.com/v1，如需自定义则设置）
npx wrangler pages secret put DATALER_URL --project-name=qoderwork-web

# 如果可灵视频使用独立的 Key/地址，可额外设置（可选）
npx wrangler pages secret put KLING_API_KEY --project-name=qoderwork-web
npx wrangler pages secret put KLING_URL --project-name=qoderwork-web
```

每次命令执行后会提示输入值，粘贴后回车即可。

---

## 第三步：部署到 Cloudflare Pages

```bash
npx wrangler pages deploy . --project-name=qoderwork-web
```

首次部署会自动创建 Pages 项目。成功后显示：

```
Published qoderwork-web (0.45 sec)
  https://qoderwork-web.pages.dev
  https://qoderwork-web.你的用户名.pages.dev
```

---

## 第四步：团队使用

把 Pages 地址发给团队成员，浏览器直接打开即可使用。

**注意**：部署后首次访问，团队成员需要在前端设置页面输入各自的激活码和密码（由管理员分配）。

---

## 后续更新代码

如果修改了页面或逻辑，重新执行部署命令：

```bash
cd "C:\Users\21255\Desktop\QW工作空间\qoderwork-web"
npx wrangler pages deploy . --project-name=qoderwork-web
```

---

## 常见问题

**Q：部署后 API 调用报 500？**
A：检查 `DATALER_API_KEY` 是否已正确设置：
```bash
npx wrangler pages secret list --project-name=qoderwork-web
```

**Q：国内访问慢？**
A：Cloudflare Pages 在国内有部分 CDN 节点。如需更快，可以在 Cloudflare Dashboard 中绑定自己的域名（中国大陆备案域名效果更佳）。

**Q：想换其他中转站？**
A：修改 `DATALER_URL` secret 即可：
```bash
npx wrangler pages secret put DATALER_URL --project-name=qoderwork-web
```

**Q：本地如何预览部署效果？**
A：
```bash
npx wrangler pages dev .
```
