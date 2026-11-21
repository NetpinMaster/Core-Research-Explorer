import { DOCUMENT } from '@angular/common';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('defaults to light mode and toggles cleanly to dark and back', () => {
    const service = TestBed.inject(ThemeService);
    const doc = TestBed.inject(DOCUMENT);

    expect(service.theme()).toBe('light');
    expect(doc.documentElement.getAttribute('data-theme')).toBeNull();

    service.toggleTheme();
    expect(service.theme()).toBe('dark');
    expect(doc.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('core_explorer_theme')).toBe('dark');

    service.toggleTheme();
    expect(service.theme()).toBe('light');
    expect(doc.documentElement.getAttribute('data-theme')).toBeNull();
  });

  it('hydrates stored dark theme preference on initialization', () => {
    localStorage.setItem('core_explorer_theme', 'dark');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });

    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
