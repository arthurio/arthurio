/**
 * Optional runtime fetch of the owner's public repositories, with a static
 * fallback from profile.ts when the request fails, times out or returns junk.
 */

import { profile, type Project } from '../data/profile';

export interface ProjectsResult {
  projects: readonly Project[];
  source: 'github' | 'static';
}

export interface GithubOptions {
  user?: string;
  timeoutMs?: number;
  limit?: number;
  fetchImpl?: typeof fetch;
  fallback?: readonly Project[];
}

const GITHUB_URL_PREFIX = 'https://github.com/';

/** Defensive parse of the GitHub REST payload; never trusts its shape. */
export function parseRepos(payload: unknown, user: string, limit = 8): Project[] {
  if (!Array.isArray(payload)) return [];
  const repos: { project: Project; stars: number }[] = [];
  for (const item of payload as unknown[]) {
    if (typeof item !== 'object' || item === null) continue;
    const r = item as Record<string, unknown>;
    const name = r['name'];
    const url = r['html_url'];
    if (typeof name !== 'string' || typeof url !== 'string') continue;
    if (!url.startsWith(GITHUB_URL_PREFIX)) continue;
    if (r['fork'] === true || r['archived'] === true) continue;
    if (name.toLowerCase() === user.toLowerCase()) continue; // the profile README repo
    const description = typeof r['description'] === 'string' ? r['description'] : '';
    const stars = typeof r['stargazers_count'] === 'number' ? r['stargazers_count'] : 0;
    repos.push({ project: { name, url, description }, stars });
  }
  repos.sort((a, b) => b.stars - a.stars);
  return repos.slice(0, limit).map((r) => r.project);
}

/** Fetch repos; throws on any failure. */
export async function fetchRepos(options: GithubOptions = {}): Promise<Project[]> {
  const user = options.user ?? profile.handle;
  const doFetch = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 4000);
  try {
    const response = await doFetch(
      `https://api.github.com/users/${encodeURIComponent(user)}/repos?per_page=100&sort=updated`,
      { signal: controller.signal, headers: { Accept: 'application/vnd.github+json' } },
    );
    if (!response.ok) throw new Error(`GitHub API responded ${response.status}`);
    const projects = parseRepos(await response.json(), user, options.limit);
    if (projects.length === 0) throw new Error('GitHub API returned no usable repositories');
    return projects;
  } finally {
    clearTimeout(timer);
  }
}

let cached: ProjectsResult | null = null;

/** GitHub projects, or the static list on failure. Successful results are cached. */
export async function loadProjects(options: GithubOptions = {}): Promise<ProjectsResult> {
  if (cached && options.fetchImpl === undefined) return cached;
  try {
    const projects = await fetchRepos(options);
    const result: ProjectsResult = { projects, source: 'github' };
    if (options.fetchImpl === undefined) cached = result;
    return result;
  } catch {
    return { projects: options.fallback ?? profile.projects, source: 'static' };
  }
}
