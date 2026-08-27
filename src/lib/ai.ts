import OpenAI from "openai";
import { z } from "zod";

import { aiAnalysisSchema, type AIAnalysis } from "@/lib/schema";
import type { RepositoryEvidence } from "@/lib/github";

interface AIConfig {
  apiKey: string;
  baseURL: string;
  model: "deepseek-v4-pro";
}

type BailianRequest = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & {
  enable_thinking: boolean;
};

const systemPrompt = `你是 LearnFromGitHub 的中文开源项目分析编辑。
你只能依据用户提供的 GitHub Trending 数据、Repository Metadata、README 和依赖文件作出判断。
严禁声称阅读过完整源码，严禁编造架构、API、数据库、Agent、模型或实现细节。
信息不足时必须明确写“根据 README 和公开项目信息，目前可以确认……”。
所有解释性内容必须使用简体中文；Repository、语言、框架、Library、API、模型和技术术语保留官方英文名称。
输出必须是一个符合指定 Schema 的 JSON 对象，不要输出 Markdown 代码块或额外说明。`;

function buildUserPrompt(repository: RepositoryEvidence): string {
  const dependencies = Object.entries(repository.dependencyFiles)
    .map(([filename, content]) => `\n### ${filename}\n${content}`)
    .join("\n");

  return `请根据以下真实材料生成 JSON 分析报告。

## 输出要求
- summary：用 1–2 个短段落解释项目是什么，不照抄 README。
- whyItMatters：解释它解决的问题、现在值得关注的原因或体现的趋势，不要只罗列功能。
- howItWorks：只描述材料能确认的实现思路；证据不足时主动限定结论。
- tags：1–5 个简短标签。
- technologies：只列材料可以确认的主要技术，不要猜测。
- learn.topics：3–5 个最值得学习的概念或技术。
- learn.learningPath：一小段中文学习顺序，不生成庞大课程。
- build：设计一个人 1–2 天可完成的缩小版 Side Project，features 必须为 3–5 项。
- build.title 必须是这个 Side Project 自己的简短项目名，并与 description 一致；不能写成“分析报告”“学习报告”或原 Repository 的报告标题。
- difficulty 只能是 beginner、intermediate 或 advanced。

## GitHub Trending 与 Metadata
- Full name: ${repository.fullName}
- URL: ${repository.url}
- Description: ${repository.description ?? "未提供"}
- Primary language: ${repository.primaryLanguage ?? "未提供"}
- Total stars: ${repository.totalStars}
- Stars this week: ${repository.starsThisWeek ?? "未提供"}

## README
${repository.readme ?? "README 未获取到，请明确限制分析结论。"}

## Dependency Files
${dependencies || "未找到 package.json、requirements.txt 或 pyproject.toml。"}`;
}

function parseModelJSON(content: string): unknown {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  return JSON.parse(cleaned);
}

function errorSummary(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
      .join("；");
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function analyzeRepository(
  repository: RepositoryEvidence,
  config: AIConfig,
): Promise<AIAnalysis> {
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL.replace(/\/$/, ""),
  });

  let lastError: unknown;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const responseFormat =
      attempt === 1
        ? {
            type: "json_schema" as const,
            json_schema: {
              name: "repository_analysis",
              strict: true,
              schema: z.toJSONSchema(aiAnalysisSchema),
            },
          }
        : { type: "json_object" as const };

    const request: BailianRequest = {
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: buildUserPrompt(repository) },
      ],
      response_format: responseFormat,
      enable_thinking: false,
    };

    try {
      const response = await client.chat.completions.create(request);
      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("模型返回了空内容");
      return aiAnalysisSchema.parse(parseModelJSON(content));
    } catch (error) {
      lastError = error;
      if (attempt === 1) {
        console.warn(`  JSON Schema 分析失败，将以 JSON Object 重试一次：${errorSummary(error)}`);
      }
    }
  }

  throw new Error(`DeepSeek 分析两次均失败：${errorSummary(lastError)}`);
}
