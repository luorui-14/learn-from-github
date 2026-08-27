import { copyFile, mkdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { analyzeRepository } from "@/lib/ai";
import { getPipelineEnv } from "@/lib/env";
import {
  fetchTrendingRepositories,
  hydrateRepository,
  safeErrorMessage,
} from "@/lib/github";
import {
  repositoryReportSchema,
  weeklyReportSchema,
  type RepositoryReport,
  type WeeklyReport,
} from "@/lib/schema";

export interface PipelineResult {
  outputPath: string;
  report: WeeklyReport;
}

function weekOfInShanghai(now = new Date()): string {
  const local = new Date(now.getTime() + 8 * 60 * 60 * 1_000);
  const day = local.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  local.setUTCDate(local.getUTCDate() - daysSinceMonday);
  return local.toISOString().slice(0, 10);
}

async function atomicWriteJSON(outputPath: string, value: unknown): Promise<void> {
  const temporaryPath = `${outputPath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");

  try {
    await rename(temporaryPath, outputPath);
  } catch (error) {
    const code = error instanceof Error && "code" in error ? (error as NodeJS.ErrnoException).code : null;
    if (code !== "EEXIST" && code !== "EPERM") throw error;
    await copyFile(temporaryPath, outputPath);
    await unlink(temporaryPath);
  }
}

export async function runPipeline(limit = 5): Promise<PipelineResult> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 5) {
    throw new Error("--limit 必须是 1–5 的整数");
  }

  const env = getPipelineEnv();
  console.log(`开始抓取 GitHub Weekly Trending（前 ${limit} 个）…`);
  const trendingRepositories = await fetchTrendingRepositories(limit);
  const repositories: RepositoryReport[] = [];

  for (const [index, trending] of trendingRepositories.entries()) {
    const label = `${trending.owner}/${trending.name}`;
    console.log(`[${index + 1}/${trendingRepositories.length}] 分析 ${label}`);

    try {
      const evidence = await hydrateRepository(trending, env.GITHUB_TOKEN);
      const analysis = await analyzeRepository(evidence, {
        apiKey: env.DASHSCOPE_API_KEY,
        baseURL: env.BAILIAN_BASE_URL,
        model: env.AI_MODEL,
      });

      repositories.push(
        repositoryReportSchema.parse({
          owner: evidence.owner,
          name: evidence.name,
          fullName: evidence.fullName,
          url: evidence.url,
          description: evidence.description,
          primaryLanguage: evidence.primaryLanguage,
          totalStars: evidence.totalStars,
          starsThisWeek: evidence.starsThisWeek,
          analysis,
        }),
      );
      console.log(`  完成：${label}`);
    } catch (error) {
      console.error(`  跳过 ${label}：${safeErrorMessage(error)}`);
    }
  }

  const minimumSuccess = limit === 1 ? 1 : Math.min(3, limit);
  if (repositories.length < minimumSuccess) {
    throw new Error(
      `有效项目只有 ${repositories.length} 个，至少需要 ${minimumSuccess} 个；未覆盖已有 latest 数据`,
    );
  }

  const report = weeklyReportSchema.parse({
    weekOf: weekOfInShanghai(),
    generatedAt: new Date().toISOString(),
    repositories,
  });

  const dataDirectory = path.join(process.cwd(), "data");
  await mkdir(dataDirectory, { recursive: true });
  const outputPath = path.join(dataDirectory, limit === 1 ? "smoke.json" : "latest.json");
  await atomicWriteJSON(outputPath, report);

  console.log(`Pipeline 完成：${repositories.length} 个项目已写入 ${path.relative(process.cwd(), outputPath)}`);
  return { outputPath, report };
}
