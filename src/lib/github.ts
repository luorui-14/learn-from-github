import * as cheerio from "cheerio";

const TRENDING_URL = "https://github.com/trending?since=weekly";
const GITHUB_API = "https://api.github.com";
const README_LIMIT = 18_000;
const DEPENDENCY_LIMIT = 8_000;
const DEPENDENCY_FILES = ["package.json", "requirements.txt", "pyproject.toml"] as const;

export interface TrendingRepository {
  owner: string;
  name: string;
  url: string;
  description: string | null;
  primaryLanguage: string | null;
  totalStars: number;
  starsThisWeek: number | null;
}

export interface RepositoryEvidence extends TrendingRepository {
  fullName: string;
  readme: string | null;
  dependencyFiles: Record<string, string>;
}

function compactText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function parseStarCount(raw: string): number | null {
  const normalized = raw.trim().toLowerCase().replace(/,/g, "");
  const match = normalized.match(/([\d.]+)\s*([km])?/i);
  if (!match) return null;

  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  const multiplier = match[2] === "k" ? 1_000 : match[2] === "m" ? 1_000_000 : 1;
  return Math.round(value * multiplier);
}

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(30_000),
      });
      if (response.status < 500 || attempt === 2) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt === 2) throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  throw lastError;
}

export async function fetchTrendingRepositories(limit = 5): Promise<TrendingRepository[]> {
  const response = await fetchWithRetry(TRENDING_URL, {
    headers: {
      Accept: "text/html",
      "User-Agent": "LearnFromGitHub/0.1",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub Trending 请求失败（HTTP ${response.status}）`);
  }

  const $ = cheerio.load(await response.text());
  const repositories: TrendingRepository[] = [];

  $("article.Box-row")
    .slice(0, limit)
    .each((_, element) => {
      const article = $(element);
      const path = article.find("h2 a").attr("href")?.trim();
      if (!path) return;

      const [owner, name] = path.split("/").filter(Boolean);
      if (!owner || !name) return;

      const weeklyText = compactText(article.find("span.d-inline-block.float-sm-right").text());
      const weeklyMatch = weeklyText.match(/([\d,.]+(?:\.[\d]+)?\s*[km]?)\s+stars?\s+this\s+week/i);
      const totalStarsText = compactText(article.find(`a[href="/${owner}/${name}/stargazers"]`).text());

      repositories.push({
        owner,
        name,
        url: `https://github.com/${owner}/${name}`,
        description: compactText(article.find("p.col-9").text()) || null,
        primaryLanguage: compactText(article.find('[itemprop="programmingLanguage"]').text()) || null,
        totalStars: parseStarCount(totalStarsText) ?? 0,
        starsThisWeek: weeklyMatch ? parseStarCount(weeklyMatch[1]) : null,
      });
    });

  if (repositories.length < Math.min(limit, 3)) {
    throw new Error(`GitHub Trending 只解析到 ${repositories.length} 个项目，页面结构可能已变化`);
  }

  return repositories;
}

function githubHeaders(token: string, accept = "application/vnd.github+json") {
  return {
    Accept: accept,
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "LearnFromGitHub/0.1",
  };
}

async function fetchOptionalText(url: string, token: string, limit: number): Promise<string | null> {
  const response = await fetchWithRetry(url, {
    headers: githubHeaders(token, "application/vnd.github.raw+json"),
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`GitHub Contents 请求失败（HTTP ${response.status}）`);
  }

  return (await response.text()).slice(0, limit);
}

export async function hydrateRepository(
  trending: TrendingRepository,
  token: string,
): Promise<RepositoryEvidence> {
  const repositoryUrl = `${GITHUB_API}/repos/${encodeURIComponent(trending.owner)}/${encodeURIComponent(trending.name)}`;
  const metadataResponse = await fetchWithRetry(repositoryUrl, {
    headers: githubHeaders(token),
  });

  if (!metadataResponse.ok) {
    throw new Error(`GitHub Metadata 请求失败（HTTP ${metadataResponse.status}）`);
  }

  const metadata = (await metadataResponse.json()) as {
    full_name: string;
    html_url: string;
    description: string | null;
    language: string | null;
    stargazers_count: number;
  };

  const readmePromise = fetchOptionalText(`${repositoryUrl}/readme`, token, README_LIMIT).catch(
    (error: unknown) => {
      console.warn(`  README 获取失败，继续使用其他证据：${safeErrorMessage(error)}`);
      return null;
    },
  );

  const dependencyEntries = await Promise.all(
    DEPENDENCY_FILES.map(async (filename) => {
      const content = await fetchOptionalText(
        `${repositoryUrl}/contents/${encodeURIComponent(filename)}`,
        token,
        DEPENDENCY_LIMIT,
      ).catch((error: unknown) => {
        console.warn(`  ${filename} 获取失败，已忽略：${safeErrorMessage(error)}`);
        return null;
      });
      return [filename, content] as const;
    }),
  );

  const dependencyFiles: Record<string, string> = {};
  for (const [filename, content] of dependencyEntries) {
    if (content !== null) dependencyFiles[filename] = content;
  }

  return {
    owner: trending.owner,
    name: trending.name,
    fullName: metadata.full_name,
    url: metadata.html_url,
    description: metadata.description ?? trending.description,
    primaryLanguage: metadata.language ?? trending.primaryLanguage,
    totalStars: metadata.stargazers_count,
    starsThisWeek: trending.starsThisWeek,
    readme: await readmePromise,
    dependencyFiles,
  };
}

export function safeErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause = error.cause;
  if (cause instanceof Error && cause.message !== error.message) {
    return `${error.message}（${cause.message}）`;
  }
  return error.message;
}
