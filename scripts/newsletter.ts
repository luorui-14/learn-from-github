import "dotenv/config";

import { loadLatestReport } from "@/lib/data";
import { sendNewsletter } from "@/lib/newsletter";

async function main() {
  const report = await loadLatestReport();
  if (!report) {
    throw new Error("未找到 data/latest.json，请先运行 npm run pipeline");
  }

  const id = await sendNewsletter(report);
  console.log(`Newsletter 已被 Resend 接受，邮件 ID：${id}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
