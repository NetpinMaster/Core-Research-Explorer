import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SearchHistoryService } from './search-history.service';

describe('SearchHistoryService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('records deduplicated searches capped at 6 entries and persists to localStorage', () => {
    const service = TestBed.inject(SearchHistoryService);

    service.record('drone', 20);
    service.record('drone AND delivery', 50);
    service.record('drone', 10);

    expect(service.entries().map((e) => `${e.query}:${e.limit}`)).toEqual([
      'drone:10',
      'drone AND delivery:50',
    ]);

    for (let i = 1; i <= 7; i += 1) {
      service.record(`topic-${i}`, 20);
    }
    expect(service.entries().length).toBe(6);
    expect(service.entries()[0].query).toBe('topic-7');

    service.clear();
    expect(service.entries()).toEqual([]);
  });

  it('safely ignores malformed or invalid localStorage payloads', () => {
    localStorage.setItem('core_explorer_search_history', '{bad-json');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    expect(TestBed.inject(SearchHistoryService).entries()).toEqual([]);

    localStorage.setItem(
      'core_explorer_search_history',
      JSON.stringify([
        { query: 'valid query', limit: 20, timestamp: 1000 },
        { query: '', limit: 20, timestamp: 1000 },
        { query: 'bad limit', limit: 999, timestamp: 1000 },
      ])
    );
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    expect(TestBed.inject(SearchHistoryService).entries().map((e) => e.query)).toEqual([
      'valid query',
    ]);
  });
});
