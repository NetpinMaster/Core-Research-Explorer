import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';

export type AppTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'core_explorer_theme';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly _theme = signal<AppTheme>(this.readInitialTheme());

  readonly theme = this._theme.asReadonly();

  constructor() {
    this.applyTheme(this._theme());
  }

  toggleTheme(): void {
    const next: AppTheme = this._theme() === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  setTheme(next: AppTheme): void {
    this._theme.set(next);
    this.applyTheme(next);
    this.persistTheme(next);
  }

  private readInitialTheme(): AppTheme {
    try {
      const stored = globalThis.localStorage?.getItem(THEME_STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') {
        return stored;
      }
    } catch {
      // Storage unavailable (private mode or restricted context) — fall back to light.
    }
    return 'light';
  }

  private applyTheme(theme: AppTheme): void {
    const root = this.document?.documentElement;
    if (!root) {
      return;
    }
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
  }

  private persistTheme(theme: AppTheme): void {
    try {
      globalThis.localStorage?.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage quota or privacy restrictions.
    }
  }
}
