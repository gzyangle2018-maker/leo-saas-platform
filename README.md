# Leo 团队统一 SaaS 平台

基于 qoderwork-web（AI调度中台）扩展的统一团队工具平台，整合 AI 创作与亚马逊运营工具集。

## 在线访问

**生产环境**: https://leo-saas-platform.pages.dev

## 功能模块

### AI 创作中心
- AI 多模型对话（GPT / Claude / Gemini / DeepSeek / 通义 / 文心 / Kimi 等）
- AI 批量作图（Amazon 主图 + A+ 素材生成流程）
- AI 视频生成

### 亚马逊运营工具箱
- 运营中台 Dashboard
- ASIN 工作台
- 差评处理中心
- 异常处理中心
- 任务中心
- 审批中心
- 知识库
- 智能体工作台
- 备货助手

### 团队工具
- 英语学习应用
- 英文短剧学习

### 管理后台
- 成员管理（增删改查 + 用量配额）
- 激活码管理
- API 配置管理
- 使用记录统计

## 默认账号

- 管理员: `admin` / `yangle666`
- 激活码: `yangle666` / `yangle666`

## 本地开发

```bash
npm install
npm run dev
```

## 构建部署

```bash
npm run build
npx wrangler pages deploy dist --project-name=leo-saas-platform
```

## GitHub Actions 自动部署

已在 `.github/workflows/deploy.yml` 配置自动部署到 Cloudflare Pages。

需要在仓库 Settings > Secrets 中添加:
- `CLOUDFLARE_ACCOUNT_ID`: ebba6be2d4369da1443736cb2f66b182

## 技术栈

- React 19 + Vite 8
- Tailwind CSS
- Cloudflare Pages
- Wrangler
