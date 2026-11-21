import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface AppApiConfig {
  readonly apiBaseUrl: string;
  readonly requestTimeoutMs: number;
  readonly defaultResultLimit: 10 | 20 | 50 | 100;
  readonly supportedResultLimits: readonly (10 | 20 | 50 | 100)[];
  readonly maxQueryLength: number;
}

export const APP_API_CONFIG = new InjectionToken<AppApiConfig>('APP_API_CONFIG', {
  providedIn: 'root',
  factory: (): AppApiConfig => ({
    apiBaseUrl: environment.apiBaseUrl,
    requestTimeoutMs: environment.requestTimeoutMs,
    defaultResultLimit: environment.defaultResultLimit,
    supportedResultLimits: [10, 20, 50, 100] as const,
    maxQueryLength: 500,
  }),
});
