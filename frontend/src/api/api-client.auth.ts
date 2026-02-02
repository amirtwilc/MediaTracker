import { BaseApiClient } from './api-client.base';
import { validateRequired } from './api.utils';
import { AuthResponse, LoginRequest, RegisterRequest } from './api.types';

export class AuthApiClient extends BaseApiClient {

  async login(username: string, password: string): Promise<AuthResponse> {
    validateRequired({ username, password }, ['username', 'password']);

    const response = await this.post<AuthResponse>(
      '/auth/login',
      { username, password } as LoginRequest,
      false
    );

    // Store token after successful login
    if (response.accessToken) {
      this.setToken(response.accessToken);
    }

    return response;
  }

  async register(username: string, email: string, password: string): Promise<AuthResponse> {
    validateRequired({ username, email, password }, ['username', 'email', 'password']);

    const response = await this.post<AuthResponse>(
      '/auth/register',
      { username, email, password } as RegisterRequest,
      false
    );

    // Store token after successful registration
    if (response.accessToken) {
      this.setToken(response.accessToken);
    }

    return response;
  }

  logout(): void {
    this.clearToken();
  }
}