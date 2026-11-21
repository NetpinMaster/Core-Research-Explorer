import type { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  production: false,
  apiBaseUrl: '/api/core',
  requestTimeoutMs: 15_000,
  defaultResultLimit: 20,
};
