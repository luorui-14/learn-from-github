import "dotenv/config";

import { runPipeline } from "@/lib/pipeline";

function readLimit(): number {
  const inline = process.argv.find((argument) => argument.startsWith("--limit="));
  if (inline) return Number(inline.split("=")[1]);

  const index = process.argv.indexOf("--limit");
  if (index >= 0) return Number(process.argv[index + 1]);
  return 5;
}

runPipeline(readLimit()).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
