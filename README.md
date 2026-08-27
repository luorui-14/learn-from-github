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

## 部署与每周自动化

Production Dashboard：<https://learn-from-github.vercel.app>

`.github/workflows/weekly.yml` 每周一 08:00（Asia/Shanghai）自动运行，也支持从 GitHub Actions 页面手动触发。执行顺序固定为：

1. 安装依赖并执行 TypeScript 检查。
2. 执行 Pipeline，生成新的 `data/latest.json`。
3. 将公开的周报 JSON 提交回 `main`。
4. 使用 Vercel CLI 完成 Production Build 与部署。
5. 验证正式页面包含本周全部 Repository 锚点。
6. 验证通过后才发送 Newsletter。

需要配置以下 GitHub Actions Repository Secrets：

```text
DASHSCOPE_API_KEY
BAILIAN_BASE_URL
GH_API_TOKEN
RESEND_API_KEY
NEWSLETTER_FROM
NEWSLETTER_TO
VERCEL_ORG_ID
VERCEL_PROJECT_ID
VERCEL_TOKEN
```

`AI_MODEL` 和 `SITE_URL` 是非敏感固定配置，直接写在 Workflow 中。Vercel 只托管由 `data/latest.json` 构建出的静态 Dashboard，运行时不需要百炼、GitHub 或 Resend Key，因此这些 Key 不配置到 Vercel，也不会进入构建产物。
