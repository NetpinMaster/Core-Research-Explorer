import { Injectable, signal } from '@angular/core';
import type { SupportedResultLimit } from '../models/research-paper.model';
import { isSupportedResultLimit } from '../../shared/validators/result-limit.validator';

export interface RecentSearchEntry {
  readonly query: string;
  readonly limit: SupportedResultLimit;
  readonly timestamp: number;
}

const HISTORY_STORAGE_KEY = 'core_explorer_search_history';
const MAX_HISTORY_ENTRIES = 6;
const MAX_QUERY_LENGTH = 500;

@Injectable({
  providedIn: 'root',
})
export class SearchHistoryService {
  private readonly _entries = signal<readonly RecentSearchEntry[]>(this.loadFromStorage());

  readonly entries = this._entries.asReadonly();

  record(query: string, limit: SupportedResultLimit): void {
    const normalized = query.trim();
    if (normalized.length === 0 || normalized.length > MAX_QUERY_LENGTH) {
      return;
    }
    if (!isSupportedResultLimit(limit)) {
      return;
    }

    const nextEntry: RecentSearchEntry = {
      query: normalized,
      limit,
      timestamp: Date.now(),
    };

    const filtered = this._entries().filter((entry) => entry.query !== normalized);
    const updated = [nextEntry, ...filtered].slice(0, MAX_HISTORY_ENTRIES);
    this._entries.set(updated);
    this.saveToStorage(updated);
  }

  clear(): void {
    this._entries.set([]);
    try {
      globalThis.localStorage?.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      // Ignore storage restrictions.
    }
  }

  private loadFromStorage(): readonly RecentSearchEntry[] {
    try {
      const raw = globalThis.localStorage?.getItem(HISTORY_STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      const valid: RecentSearchEntry[] = [];
      const seen = new Set<string>();

      for (const item of parsed) {
        if (typeof item !== 'object' || item === null) {
          continue;
        }
        const record = item as Record<string, unknown>;
        const query = typeof record['query'] === 'string' ? record['query'].trim() : '';
        const limit = record['limit'];
        const timestamp =
          typeof record['timestamp'] === 'number' && Number.isFinite(record['timestamp'])
            ? record['timestamp']
            : Date.now();

        if (
          query.length > 0 &&
          query.length <= MAX_QUERY_LENGTH &&
          isSupportedResultLimit(limit) &&
          !seen.has(query)
        ) {
          seen.add(query);
          valid.push({ query, limit, timestamp });
          if (valid.length >= MAX_HISTORY_ENTRIES) {
            break;
          }
        }
      }

      return valid;
    } catch {
      return [];
    }
  }

  private saveToStorage(entries: readonly RecentSearchEntry[]): void {
    try {
      globalThis.localStorage?.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Ignore storage quota or privacy restrictions.
    }
  }
}
