# LearnFromGitHub

LearnFromGitHub 每周抓取 GitHub Trending 前 5 个开源项目，再依据真实的 Repository Metadata、README 和常见依赖文件，通过阿里云百炼的 `deepseek-v4-pro` 生成简体中文学习报告。

产品只包含三部分：

- Dashboard：浏览本周项目的完整中文分析
- Data Pipeline：抓取 GitHub 数据并生成结构化 JSON
- Weekly Newsletter：将本周摘要发送到一个固定邮箱

不包含登录、订阅系统、数据库、Repository 详情页或完整源码分析。

## 工作流程

```text
GitHub Weekly Trending
  → GitHub REST API（Metadata / README / Dependency Files）
  → 阿里云百炼 DeepSeek 中文结构化分析
  → Zod Schema 校验
  → data/latest.json
  → Dashboard + Resend Newsletter
```

Dashboard 和 Newsletter 始终共用 `data/latest.json`。发送 Newsletter 不会再次调用 AI。

## 技术栈

- Next.js 16、React 19、TypeScript
- Tailwind CSS 4
- Cheerio
- GitHub REST API
- OpenAI Node.js SDK + 阿里云百炼 OpenAI Compatible API
- DeepSeek `deepseek-v4-pro`
- Zod
- Resend

## 安装

需要 Node.js 20.9 或更高版本。

```bash
npm install
```

复制环境变量模板：

```bash
copy .env.example .env
```

然后在 `.env` 中填写真实配置：

```env
# Alibaba Bailian / DeepSeek
DASHSCOPE_API_KEY=
BAILIAN_BASE_URL=
AI_MODEL=deepseek-v4-pro

# GitHub
GITHUB_TOKEN=

# Resend
RESEND_API_KEY=
NEWSLETTER_FROM=
NEWSLETTER_TO=

# App
SITE_URL=http://localhost:3000
```

说明：

- `BAILIAN_BASE_URL` 使用百炼提供的 OpenAI Compatible `/compatible-mode/v1` 地址。
- `GITHUB_TOKEN` 用于读取公开 Repository Metadata 和 Contents。
- `RESEND_API_KEY` 是以 `re_` 开头的有效 API Key，不是 Key ID。
- `NEWSLETTER_FROM` 必须满足 Resend 的发件域名或测试发件人要求。
- 部署后将 `SITE_URL` 改为公开站点地址，否则邮件链接只会指向本机。
- `.env` 已加入 `.gitignore`，不要把真实 Key 写入代码、README 或 Git。

## 使用命令

### 启动 Dashboard

```bash
npm run dev
```

打开 <http://localhost:3000>。

### Smoke Test

首次接入 API 时，先只分析一个真实项目：

```bash
npm run pipeline -- --limit=1
```

结果写入 `data/smoke.json`，不会覆盖正式数据。

### 生成本周数据

```bash
npm run pipeline
```

该命令执行：

1. 抓取 Weekly Trending 前 5 名。
2. 获取 Repository Metadata、README。
3. 尝试读取 `package.json`、`requirements.txt`、`pyproject.toml`。
4. 使用 DeepSeek 生成中文 JSON 报告。
5. 使用 Zod 校验并写入 `data/latest.json`。

单个 Repository 失败不会中断其余项目。AI 结构化输出失败时最多重试一次；正式任务至少需要 3 个有效项目才会覆盖已有 `latest.json`。

### 发送 Newsletter

```bash
npm run newsletter
```

该命令只读取现有 `data/latest.json`，通过 Resend 发送到 `NEWSLETTER_TO`，不会调用 GitHub 或 AI。

### 完整 Weekly Flow

```bash
npm run weekly
```

依次执行 `pipeline → newsletter`。Pipeline 失败时不会发送邮件。

### 工程检查

```bash
npm run typecheck
npm run build
```

## 数据与 AI 边界

- README 最多发送约 18,000 字符。
- 每个依赖文件最多发送约 8,000 字符。
- 不递归扫描文件树，不读取完整源码。
- AI Prompt 明确要求只依据提供的材料；证据不足时必须限制结论。
- 用户可见的解释字段经过 Schema 和中文内容校验。
- Dependency File 不存在属于正常情况。

## 部署建议

Dashboard 可以部署到支持 Next.js 的平台。部署前先生成并提交公开的 `data/latest.json`，然后执行 Production Build。

由于 Serverless 文件系统通常不可持久写入，未来的 GitHub Actions 推荐按以下顺序运行：

1. 使用 Actions Secrets 注入全部环境变量。
2. 执行 `npm ci` 和 `npm run pipeline`。
3. 将新的 `data/latest.json` 提交回 Repository，触发站点重新部署。
4. 部署完成后执行 `npm run newsletter`，确保邮件链接指向最新 Dashboard。

建议配置的 GitHub Actions Secrets：

```text
DASHSCOPE_API_KEY
BAILIAN_BASE_URL
AI_MODEL
GITHUB_TOKEN
RESEND_API_KEY
NEWSLETTER_FROM
NEWSLETTER_TO
SITE_URL
```

当前项目没有创建远程 GitHub Repository，也没有启用自动部署或定时任务。
