import { repositoryAnchor } from "@/lib/anchors";
import type { RepositoryReport } from "@/lib/schema";

const difficultyLabels = {
  beginner: "入门",
  intermediate: "中等",
  advanced: "进阶",
} as const;

const numberFormatter = new Intl.NumberFormat("zh-CN");

function Tag({ children }: Readonly<{ children: string }>) {
  return (
    <span className="rounded-full border border-line bg-canvas px-3 py-1 font-mono text-xs font-semibold text-muted">
      {children}
    </span>
  );
}

function StageLabel({ number, title }: Readonly<{ number: string; title: string }>) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-[11px] font-bold text-white">
        {number}
      </span>
      <h3 className="text-sm font-bold tracking-[0.14em] text-ink uppercase">{title}</h3>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export function RepositoryCard({
  repository,
  index,
}: Readonly<{ repository: RepositoryReport; index: number }>) {
  const anchor = repositoryAnchor(repository.fullName);

  return (
    <article
      id={anchor}
      className="scroll-mt-6 overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_18px_45px_rgba(23,32,51,0.055)]"
    >
      <header className="border-b border-line px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-3 font-mono text-xs font-semibold tracking-[0.12em] text-accent uppercase">
              <span>Trending #{String(index).padStart(2, "0")}</span>
              <span className="size-1 rounded-full bg-line" />
              <span>{repository.primaryLanguage ?? "语言未提供"}</span>
            </div>
            <h2 className="break-words text-2xl leading-tight font-bold tracking-[-0.025em] text-ink sm:text-3xl">
              <a
                href={repository.url}
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-accent"
              >
                {repository.fullName}
                <span className="ml-2 inline-block align-[0.08em] font-mono text-base text-muted" aria-hidden="true">
                  ↗
                </span>
              </a>
            </h2>
            {repository.description ? (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted sm:text-base">
                {repository.description}
              </p>
            ) : null}
          </div>

          <dl className="grid shrink-0 grid-cols-2 overflow-hidden rounded-xl border border-line bg-canvas lg:min-w-64">
            <div className="border-r border-line px-4 py-3">
              <dt className="font-mono text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">
                Total stars
              </dt>
              <dd className="mt-1 text-lg font-bold text-ink">★ {numberFormatter.format(repository.totalStars)}</dd>
            </div>
            <div className="px-4 py-3">
              <dt className="font-mono text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">
                This week
              </dt>
              <dd className="mt-1 text-lg font-bold text-accent">
                {repository.starsThisWeek === null
                  ? "未提供"
                  : `+${numberFormatter.format(repository.starsThisWeek)}`}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {repository.analysis.tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
      </header>

      <div className="relative px-5 py-7 sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute top-14 bottom-14 left-[2.25rem] hidden w-px bg-line sm:block" />

        <section className="relative sm:pl-14">
          <StageLabel number="01" title="Understand · 看懂项目" />
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h4 className="mb-2 text-base font-bold text-ink">项目简介</h4>
              <p className="whitespace-pre-line text-[15px] leading-7 text-muted">{repository.analysis.summary}</p>
            </div>
            <div>
              <h4 className="mb-2 text-base font-bold text-ink">为什么值得关注</h4>
              <p className="whitespace-pre-line text-[15px] leading-7 text-muted">
                {repository.analysis.whyItMatters}
              </p>
            </div>
          </div>
        </section>

        <section className="relative mt-10 border-t border-line pt-8 sm:pl-14">
          <StageLabel number="02" title="Inspect · 理解实现" />
          <h4 className="mb-2 text-base font-bold text-ink">实现思路</h4>
          <p className="whitespace-pre-line text-[15px] leading-7 text-muted">
            {repository.analysis.howItWorks}
          </p>

          <div className="mt-6 rounded-xl border border-line bg-canvas p-4">
            <p className="mb-3 font-mono text-[11px] font-bold tracking-[0.12em] text-muted uppercase">Confirmed stack</p>
            {repository.analysis.technologies.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {repository.analysis.technologies.map((technology) => (
                  <span
                    key={technology}
                    className="rounded-md border border-[#c9ddf6] bg-accent-soft px-2.5 py-1 font-mono text-xs font-semibold text-[#0759b8]"
                  >
                    {technology}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">现有材料不足以确认主要技术栈。</p>
            )}
          </div>
        </section>

        <section className="relative mt-10 border-t border-line pt-8 sm:pl-14">
          <StageLabel number="03" title="Learn · 找到路径" />
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h4 className="mb-3 text-base font-bold text-ink">值得学习</h4>
              <ul className="space-y-2">
                {repository.analysis.learn.topics.map((topic) => (
                  <li key={topic} className="flex items-start gap-3 text-[15px] leading-6 text-muted">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                    {topic}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-line bg-canvas p-5">
              <h4 className="mb-2 text-base font-bold text-ink">学习路径</h4>
              <p className="text-[15px] leading-7 text-muted">{repository.analysis.learn.learningPath}</p>
            </div>
          </div>
        </section>

        <section className="relative mt-10 border-t border-line pt-8 sm:pl-14">
          <StageLabel number="04" title="Build · 动手复刻" />
          <div className="rounded-xl border border-[#cce8d7] bg-success-soft p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-mono text-[11px] font-bold tracking-[0.12em] text-[#287c4c] uppercase">Side project</p>
                <h4 className="mt-1 text-xl font-bold tracking-[-0.015em] text-ink">
                  {repository.analysis.build.title}
                </h4>
              </div>
              <span className="w-fit rounded-full border border-[#abd4bb] bg-white px-3 py-1 text-xs font-bold text-[#287c4c]">
                难度：{difficultyLabels[repository.analysis.build.difficulty]}
              </span>
            </div>
            <p className="mt-4 text-[15px] leading-7 text-muted">{repository.analysis.build.description}</p>
            <div className="mt-5">
              <p className="mb-3 text-sm font-bold text-ink">推荐 MVP</p>
              <ol className="grid gap-2 sm:grid-cols-2">
                {repository.analysis.build.features.map((feature, featureIndex) => (
                  <li
                    key={feature}
                    className="flex gap-3 rounded-lg border border-[#cce8d7] bg-white/70 px-3 py-2.5 text-sm leading-6 text-muted"
                  >
                    <span className="font-mono text-xs font-bold text-[#287c4c]">
                      {String(featureIndex + 1).padStart(2, "0")}
                    </span>
                    {feature}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}
