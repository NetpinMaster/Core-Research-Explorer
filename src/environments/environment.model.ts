export interface AppEnvironment {
  readonly production: boolean;
  readonly apiBaseUrl: string;
  readonly requestTimeoutMs: number;
  readonly defaultResultLimit: 10 | 20 | 50 | 100;
}
