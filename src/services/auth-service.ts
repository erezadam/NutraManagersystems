import type { User } from '../types/entities';
import { HttpClient } from './http';

export class AuthService {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  async me(): Promise<User> {
    return this.http.request<User>(`/api/apps/${this.http.getAppId()}/entities/User/me`);
  }
}
