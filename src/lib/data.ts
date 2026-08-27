import { readFile } from "node:fs/promises";
import path from "node:path";

import { weeklyReportSchema, type WeeklyReport } from "@/lib/schema";

export const latestDataPath = path.join(process.cwd(), "data", "latest.json");

export async function loadLatestReport(): Promise<WeeklyReport | null> {
  try {
    const content = await readFile(latestDataPath, "utf8");
    return weeklyReportSchema.parse(JSON.parse(content));
  } catch (error) {
    if (isMissingFile(error)) return null;
    throw error;
  }
}

function isMissingFile(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}
