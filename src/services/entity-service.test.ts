import { afterEach, describe, expect, it, vi } from 'vitest';
import { EntityService } from './entity-service';
import { HttpClient, HttpError } from './http';

interface TestEntity {
  id: string;
  name?: string;
}

function mockJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (key: string) => (key.toLowerCase() === 'content-type' ? 'application/json' : null)
    },
    json: async () => body,
    text: async () => JSON.stringify(body)
  } as unknown as Response;
}

describe('EntityService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(['Vitamin', 'Food', 'DeficiencySymptom', 'Disease', 'Article'])(
    'lists %s entities with correct endpoint',
    async (entityName) => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockJsonResponse([]));
      const http = new HttpClient({
        baseUrl: 'https://base44.app',
        appId: 'app_123'
      });

      const service = new EntityService<TestEntity>(entityName, http);
      await service.list();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe(`https://base44.app/api/apps/app_123/entities/${entityName}`);
      expect((options?.method ?? 'GET').toString()).toBe('GET');
    }
  );

  it('creates with POST and payload', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockJsonResponse({ id: '1', name: 'x' }));
    const http = new HttpClient({
      baseUrl: 'https://base44.app',
      appId: 'app_123'
    });

    const service = new EntityService<TestEntity>('Vitamin', http);
    await service.create({ name: 'created' });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, options] = fetchSpy.mock.calls[0];
    expect(options?.method).toBe('POST');
    expect(options?.body).toBe(JSON.stringify({ name: 'created' }));
  });

  it('throws HttpError on non-2xx responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockJsonResponse({ message: 'forbidden' }, 403));
    const http = new HttpClient({
      baseUrl: 'https://base44.app',
      appId: 'app_123'
    });

    const service = new EntityService<TestEntity>('Vitamin', http);

    await expect(service.list()).rejects.toBeInstanceOf(HttpError);
  });
});
