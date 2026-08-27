import { Resend } from "resend";

import { repositoryAnchor } from "@/lib/anchors";
import { getNewsletterEnv } from "@/lib/env";
import type { RepositoryReport, WeeklyReport } from "@/lib/schema";

function escapeHTML(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character];
  });
}

function excerpt(value: string, maxLength = 180): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;
  const candidate = compact.slice(0, maxLength);
  const punctuation = Math.max(
    candidate.lastIndexOf("。"),
    candidate.lastIndexOf("！"),
    candidate.lastIndexOf("？"),
  );
  return `${candidate.slice(0, punctuation > maxLength / 2 ? punctuation + 1 : maxLength).trim()}…`;
}

function repositoryURL(siteURL: string, repository: RepositoryReport): string {
  const url = new URL(siteURL);
  url.hash = repositoryAnchor(repository.fullName);
  return url.toString();
}

export function renderNewsletter(report: WeeklyReport, siteURL: string) {
  const subject = `LearnFromGitHub 周刊｜本周值得关注的 ${report.repositories.length} 个开源项目`;
  const items = report.repositories
    .map((repository) => {
      const url = repositoryURL(siteURL, repository);
      return `<section style="border-top:1px solid #d8dee8;padding:28px 0;">
  <p style="margin:0 0 8px;color:#52606d;font:600 12px/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.08em;text-transform:uppercase;">${escapeHTML(repository.primaryLanguage ?? "Open Source")}</p>
  <h2 style="margin:0 0 14px;color:#111827;font:700 22px/1.3 Arial,'Microsoft YaHei',sans-serif;">${escapeHTML(repository.fullName)}</h2>
  <p style="margin:0 0 12px;color:#344054;font:400 15px/1.75 Arial,'Microsoft YaHei',sans-serif;">${escapeHTML(excerpt(repository.analysis.summary))}</p>
  <p style="margin:0 0 18px;color:#344054;font:400 15px/1.75 Arial,'Microsoft YaHei',sans-serif;"><strong style="color:#111827;">为什么值得关注：</strong>${escapeHTML(excerpt(repository.analysis.whyItMatters))}</p>
  <a href="${escapeHTML(url)}" style="color:#0969da;font:600 14px/1.5 Arial,'Microsoft YaHei',sans-serif;text-decoration:none;">查看完整分析 →</a>
</section>`;
    })
    .join("");

  const html = `<!doctype html>
<html lang="zh-CN">
<body style="margin:0;background:#f6f8fa;padding:24px 12px;">
  <main style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #d8dee8;border-radius:16px;padding:36px 40px;">
    <p style="margin:0 0 10px;color:#0969da;font:700 13px/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;letter-spacing:.08em;">LEARN FROM GITHUB</p>
    <h1 style="margin:0 0 12px;color:#111827;font:750 30px/1.25 Arial,'Microsoft YaHei',sans-serif;">本周值得学习和复刻的开源项目</h1>
    <p style="margin:0 0 30px;color:#667085;font:400 15px/1.7 Arial,'Microsoft YaHei',sans-serif;">从 GitHub Trending 出发，快速看懂项目、找到学习路径，再做一个自己的小作品。</p>
    ${items}
    <p style="margin:28px 0 0;color:#98a2b3;font:400 12px/1.6 Arial,'Microsoft YaHei',sans-serif;">本期内容生成于 ${escapeHTML(new Date(report.generatedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }))}</p>
  </main>
</body>
</html>`;

  const text = [
    "LearnFromGitHub 周刊",
    "本周值得学习和复刻的开源项目",
    "",
    ...report.repositories.flatMap((repository) => [
      repository.fullName,
      excerpt(repository.analysis.summary),
      `为什么值得关注：${excerpt(repository.analysis.whyItMatters)}`,
      `查看完整分析：${repositoryURL(siteURL, repository)}`,
      "",
    ]),
  ].join("\n");

  return { subject, html, text };
}

export async function sendNewsletter(report: WeeklyReport): Promise<string> {
  const env = getNewsletterEnv();
  const resend = new Resend(env.RESEND_API_KEY);
  const message = renderNewsletter(report, env.SITE_URL);
  const { data, error } = await resend.emails.send({
    from: env.NEWSLETTER_FROM,
    to: [env.NEWSLETTER_TO],
    subject: message.subject,
    html: message.html,
    text: message.text,
  });

  if (error) throw new Error(`Resend 请求失败：${error.message}`);
  if (!data?.id) throw new Error("Resend 未返回邮件 ID");
  return data.id;
}
