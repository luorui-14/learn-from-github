import { z } from "zod";

const containsChinese = (value: string) => /[\u3400-\u9fff]/u.test(value);

const text = z.string().trim().min(1);
const chineseText = text.refine(containsChinese, {
  message: "该字段必须包含简体中文内容",
});

export const aiAnalysisSchema = z
  .object({
    summary: chineseText,
    whyItMatters: chineseText,
    howItWorks: chineseText,
    tags: z.array(text).min(1).max(5),
    technologies: z.array(text).max(12),
    learn: z
      .object({
        topics: z.array(text).min(3).max(5),
        learningPath: chineseText,
      })
      .strict(),
    build: z
      .object({
        title: text,
        description: chineseText,
        features: z.array(chineseText).min(3).max(5),
        difficulty: z.enum(["beginner", "intermediate", "advanced"]),
      })
      .strict(),
  })
  .strict();

export const repositoryReportSchema = z
  .object({
    owner: text,
    name: text,
    fullName: text,
    url: z.url(),
    description: z.string().nullable(),
    primaryLanguage: z.string().nullable(),
    totalStars: z.number().int().nonnegative(),
    starsThisWeek: z.number().int().nonnegative().nullable(),
    analysis: aiAnalysisSchema,
  })
  .strict();

export const weeklyReportSchema = z
  .object({
    weekOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    generatedAt: z.iso.datetime(),
    repositories: z.array(repositoryReportSchema).min(1).max(5),
  })
  .strict();

export type AIAnalysis = z.infer<typeof aiAnalysisSchema>;
export type RepositoryReport = z.infer<typeof repositoryReportSchema>;
export type WeeklyReport = z.infer<typeof weeklyReportSchema>;
