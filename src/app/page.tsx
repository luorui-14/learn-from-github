import { RepositoryCard } from "@/components/repository-card";
import { loadLatestReport } from "@/lib/data";

export const dynamic = "force-dynamic";

function formatGeneratedAt(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function HomePage() {
  const report = await loadLatestReport();

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        <header>
          <div className="flex items-center justify-between border-b border-line pb-5">
            <p className="font-mono text-xs font-bold tracking-[0.14em] text-ink uppercase">LearnFromGitHub</p>
            <p className="hidden font-mono text-[10px] font-semibold tracking-[0.12em] text-muted uppercase sm:block">Weekly open-source field notes</p>
          </div>

          <div className="grid gap-8 py-12 lg:grid-cols-[1fr_0.58fr] lg:items-end lg:py-16">
            <div>
              <p className="mb-4 font-mono text-xs font-bold tracking-[0.16em] text-accent uppercase">
                GitHub Trending · 中文学习指南
              </p>
              <h1 className="max-w-3xl text-[2.125rem] leading-[1.08] font-bold tracking-[-0.045em] text-ink sm:text-6xl">
                从热门代码里，找到下一个值得学的项目。
              </h1>
            </div>
            <div>
              <p className="max-w-xl text-base leading-8 text-muted">
                每周发现值得学习和复刻的 GitHub 热门项目。看懂它是什么、为什么重要，再带走一条学习路径和一个真正做得完的 Side Project。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 overflow-hidden rounded-xl border border-line bg-paper">
            {["Discover", "Understand", "Learn", "Build"].map((step, index) => (
              <div
                key={step}
                className="border-r border-line px-2 py-3 text-center last:border-r-0 sm:px-5 sm:text-left"
              >
                <span className="hidden font-mono text-[10px] font-bold text-accent sm:inline">
                  {String(index + 1).padStart(2, "0")} / 
                </span>
                <span className="font-mono text-[10px] font-semibold tracking-[0.06em] text-muted uppercase sm:text-xs">
                  {step}
                </span>
              </div>
            ))}
          </div>
        </header>

        <section className="mt-14 sm:mt-18" aria-labelledby="weekly-heading">
          <div className="mb-7 flex flex-col gap-2 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1 font-mono text-[11px] font-bold tracking-[0.12em] text-accent uppercase">This week</p>
              <h2 id="weekly-heading" className="text-2xl font-bold tracking-[-0.025em] text-ink sm:text-3xl">
                本周热门开源项目
              </h2>
            </div>
            <p className="font-mono text-xs text-muted">
              {report ? `更新于 ${formatGeneratedAt(report.generatedAt)}` : "尚未生成本周数据"}
            </p>
          </div>

          {report ? (
            <div className="space-y-8">
              {report.repositories.map((repository, index) => (
                <RepositoryCard key={repository.fullName} repository={repository} index={index + 1} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-line bg-paper px-6 py-16 text-center">
              <p className="font-mono text-xs font-bold tracking-[0.12em] text-accent uppercase">Waiting for data</p>
              <h3 className="mt-3 text-xl font-bold text-ink">本周分析尚未生成</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-muted">
                运行 npm run pipeline 后，真实的 GitHub Trending 项目和中文分析会显示在这里。
              </p>
            </div>
          )}
        </section>

        <footer className="mt-14 border-t border-line py-8 font-mono text-[11px] leading-5 text-muted sm:mt-18">
          数据来自 GitHub Trending、公开 Repository Metadata、README 与常见依赖文件。AI 分析不包含完整源码审查。
        </footer>
      </div>
    </main>
  );
}
