import { z } from "zod";

const requiredValue = z.string().trim().min(1);

const pipelineEnvSchema = z.object({
  DASHSCOPE_API_KEY: requiredValue,
  BAILIAN_BASE_URL: z.url(),
  AI_MODEL: z.literal("deepseek-v4-pro"),
  GITHUB_TOKEN: requiredValue,
});

const newsletterEnvSchema = z.object({
  RESEND_API_KEY: requiredValue,
  NEWSLETTER_FROM: requiredValue,
  NEWSLETTER_TO: z.email(),
  SITE_URL: z.url(),
});

function formatMissingVariables(error: z.ZodError): string {
  const names = error.issues
    .map((issue) => issue.path[0])
    .filter((name): name is string => typeof name === "string");

  return [...new Set(names)].join(", ");
}

export function getPipelineEnv() {
  const parsed = pipelineEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Pipeline 环境变量缺失或格式错误：${formatMissingVariables(parsed.error)}`);
  }
  return parsed.data;
}

export function getNewsletterEnv() {
  const parsed = newsletterEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Newsletter 环境变量缺失或格式错误：${formatMissingVariables(parsed.error)}`);
  }
  return parsed.data;
}
