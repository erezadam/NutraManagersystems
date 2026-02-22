export class HttpError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}

export interface HttpClientOptions {
  baseUrl: string;
  appId: string;
  accessToken?: string;
  functionsVersion?: string;
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly appId: string;
  private readonly accessToken?: string;
  private readonly functionsVersion?: string;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.appId = options.appId;
    this.accessToken = options.accessToken;
    this.functionsVersion = options.functionsVersion;
  }

  getAppId(): string {
    return this.appId;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers ?? {});
    headers.set('Content-Type', 'application/json');
    headers.set('X-App-Id', this.appId);

    if (this.accessToken) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }

    if (this.functionsVersion) {
      headers.set('Base44-Functions-Version', this.functionsVersion);
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const payload = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const message =
        typeof payload === 'object' && payload && 'message' in payload
          ? String((payload as { message: string }).message)
          : `HTTP ${response.status}`;
      throw new HttpError(message, response.status, payload);
    }

    return payload as T;
  }
}
