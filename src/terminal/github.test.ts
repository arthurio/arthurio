import { describe, expect, it, vi } from 'vitest';
import { profile } from '../data/profile';
import { fetchRepos, loadProjects } from './github';

const okResponse = (body: unknown): Response =>
  ({ ok: true, status: 200, json: () => Promise.resolve(body) }) as unknown as Response;

describe('loadProjects', () => {
  it('returns GitHub data on success', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        okResponse([{ name: 'x', html_url: 'https://github.com/arthurio/x', description: 'd' }]),
      );
    const r = await loadProjects({ fetchImpl });
    expect(r.source).toBe('github');
    expect(r.projects[0]?.name).toBe('x');
  });

  it('falls back to static data on network failure, bad status, or empty payload', async () => {
    for (const fetchImpl of [
      vi.fn().mockRejectedValue(new Error('offline')),
      vi.fn().mockResolvedValue({ ok: false, status: 403 }),
      vi.fn().mockResolvedValue(okResponse([])),
    ]) {
      const r = await loadProjects({ fetchImpl });
      expect(r).toEqual({ projects: profile.projects, source: 'static' });
    }
  });

  it('times out hung requests', async () => {
    const fetchImpl = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    await expect(fetchRepos({ fetchImpl, timeoutMs: 10 })).rejects.toThrow();
    expect((await loadProjects({ fetchImpl, timeoutMs: 10 })).source).toBe('static');
  });
});
