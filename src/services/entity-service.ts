import { HttpClient } from './http';

export class EntityService<T extends { id: string }, TCreate = Partial<T>, TUpdate = Partial<T>> {
  private readonly entityName: string;
  private readonly http: HttpClient;

  constructor(entityName: string, http: HttpClient) {
    this.entityName = entityName;
    this.http = http;
  }

  async list(sort?: string): Promise<T[]> {
    const query = sort ? `?sort=${encodeURIComponent(sort)}` : '';
    return this.http.request<T[]>(`/api/apps/${this.http.getAppId()}/entities/${this.entityName}${query}`);
  }

  async get(id: string): Promise<T> {
    return this.http.request<T>(`/api/apps/${this.http.getAppId()}/entities/${this.entityName}/${id}`);
  }

  async create(data: TCreate): Promise<T> {
    return this.http.request<T>(`/api/apps/${this.http.getAppId()}/entities/${this.entityName}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async update(id: string, data: TUpdate): Promise<T> {
    return this.http.request<T>(`/api/apps/${this.http.getAppId()}/entities/${this.entityName}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async delete(id: string): Promise<void> {
    await this.http.request<unknown>(`/api/apps/${this.http.getAppId()}/entities/${this.entityName}/${id}`, {
      method: 'DELETE'
    });
  }
}
