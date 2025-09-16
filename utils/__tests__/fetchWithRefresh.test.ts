import { vi, describe, it, expect, beforeEach } from 'vitest';
import { fetchWithRefresh } from '../fetchWithRefresh';

describe('fetchWithRefresh', () => {
  beforeEach(() => {
    // Reset global fetch mock between tests
    // @ts-expect-error reset for test
    globalThis.fetch = undefined;
  });

  it('returns successful response and includes credentials', async () => {
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    globalThis.fetch = mock;

    const res = await fetchWithRefresh('/api/hello');
    expect(res.status).toBe(200);
    expect(mock).toHaveBeenCalledTimes(1);
    const lastArgs = mock.mock.calls[0];
    expect(lastArgs[1]).toBeDefined();
    expect(lastArgs[1].credentials).toBe('include');
  });

  it('performs a refresh on 401 and retries the original request', async () => {
    let call = 0;
    const mock = vi.fn((input: unknown) => {
      call += 1;
      if (input === '/api/auth/refresh') {
        return Promise.resolve(new Response(null, { status: 200 }));
      }
      if (call === 1) {
        return Promise.resolve(new Response(null, { status: 401 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ refreshed: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    });
    globalThis.fetch = mock;

    const res = await fetchWithRefresh('/api/protected');
    expect(res.status).toBe(200);
    expect(mock).toHaveBeenCalled();
    // first call to protected resource, second call to refresh, third call retry
    expect(mock.mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});
