import { HttpClient } from './http';

interface InvokeLLMInput {
  prompt: string;
  add_context_from_internet?: boolean;
}

export class IntegrationService {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  async invokeLLM(input: InvokeLLMInput): Promise<string> {
    const result = await this.http.request<unknown>(
      `/api/apps/${this.http.getAppId()}/integration-endpoints/Core/InvokeLLM`,
      {
        method: 'POST',
        body: JSON.stringify(input)
      }
    );

    if (typeof result === 'string') {
      return result;
    }

    if (typeof result === 'object' && result && 'response' in result && typeof result.response === 'string') {
      return result.response;
    }

    return JSON.stringify(result);
  }

  async uploadFile(file: File): Promise<string> {
    const form = new FormData();
    form.append('file', file, file.name);

    const response = await fetch(
      `${this.http.getBaseUrl()}/api/apps/${this.http.getAppId()}/integration-endpoints/Core/UploadFile`,
      {
        method: 'POST',
        headers: {
          'X-App-Id': this.http.getAppId()
        },
        body: form
      }
    );

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
    }

    const data = (await response.json()) as { file_url?: string };
    if (!data.file_url) {
      throw new Error('Upload succeeded but file_url is missing');
    }

    return data.file_url;
  }
}
