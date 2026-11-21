import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ResearchSearchStore } from '../../core/services/research-search.store';
import { SearchSuggestionsService } from '../../core/services/search-suggestions.service';
import { AnalyticsPanelComponent } from '../research-analytics/analytics-panel/analytics-panel.component';
import { PublicationYearChartComponent } from '../research-analytics/publication-year-chart/publication-year-chart.component';
import { PaperDetailDialogComponent } from '../research-results/paper-detail-dialog/paper-detail-dialog.component';
import { ResearchPaperCardComponent } from '../research-results/research-paper-card/research-paper-card.component';
import { ResearchResultsToolbarComponent } from '../research-results/research-results-toolbar/research-results-toolbar.component';
import { PaperCardSkeletonComponent } from '../../shared/components/paper-card-skeleton/paper-card-skeleton.component';
import { StateFeedbackComponent } from '../../shared/components/state-feedback/state-feedback.component';
import {
  buildCsvFilename,
  buildPapersCsv,
  triggerCsvDownload,
} from '../../shared/utilities/csv-export.util';
import {
  ResearchSearchBarComponent,
  type SearchSubmitPayload,
} from './research-search-bar/research-search-bar.component';
import type {
  ResearchPaper,
  ResearchSortOption,
  SupportedResultLimit,
} from '../../core/models/research-paper.model';

@Component({
  selector: 'app-research-explorer-page',
  standalone: true,
  imports: [
    ResearchSearchBarComponent,
    ResearchResultsToolbarComponent,
    ResearchPaperCardComponent,
    PaperDetailDialogComponent,
    AnalyticsPanelComponent,
    PublicationYearChartComponent,
    StateFeedbackComponent,
    PaperCardSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-research-search-bar
      [query]="store.query()"
      [limit]="store.limit()"
      [limitOptions]="store.limitOptions"
      [isLoading]="store.isLoading()"
      [validationError]="store.validationError()"
      [recentSearches]="store.recentSearches()"
      [suggestions]="suggestionsService.suggestions()"
      [isLoadingSuggestions]="suggestionsService.isLoading()"
      (searchSubmit)="onSearchSubmit($event)"
      (limitChange)="onLimitChange($event)"
      (clearSearch)="onClearSearch()"
      (clearHistory)="store.clearSearchHistory()"
      (queryDraftChange)="onQueryDraftChange($event)"
    />

    <div class="workspace">
      <div class="workspace__container">
        <div class="workspace__grid">
          <section class="workspace__results" aria-label="Research results">
            <app-research-results-toolbar
              [activeQuery]="store.activeQuery()"
              [returnedCount]="store.papers().length"
              [totalHits]="store.totalHits()"
              [requestedLimit]="store.activeQuery() ? store.lastRequestedLimit() : store.limit()"
              [sort]="store.sort()"
              [isLoading]="store.isLoading()"
              (sortChange)="onSortChange($event)"
              (exportCsv)="onExportCsv()"
            />

            <div class="workspace__body">
              @if (store.isLoading()) {
                <app-paper-card-skeleton [count]="4" />
              } @else if (store.apiError(); as error) {
                <app-state-feedback
                  variant="error"
                  title="Unable to retrieve research papers"
                  [message]="error.message"
                  [detail]="error.retryAfter ? 'Retry after: ' + error.retryAfter : null"
                  actionLabel="Retry search"
                  (action)="onRetry()"
                />
              } @else if (store.papers().length > 0) {
                <div class="paper-list" data-testid="paper-results-list">
                  @for (paper of store.papers(); track paper.id) {
                    <app-research-paper-card
                      [paper]="paper"
                      (inspectPaper)="openPaperDetail($event)"
                    />
                  }
                </div>
              } @else if (store.hasSearched()) {
                <app-state-feedback
                  variant="empty"
                  title="No matching research papers found"
                  message="CORE returned zero works for this expression. Try broadening your terms, switching AND to OR, or checking field prefixes."
                  actionLabel="Clear search"
                  (action)="onClearSearch()"
                />
              } @else {
                <app-state-feedback
                  variant="idle"
                  title="Start exploring scientific literature"
                  message="Enter keywords or a Boolean expression such as (drone AND (package OR delivery)) above to search open-access research works indexed by CORE."
                />
              }
            </div>
          </section>

          <aside class="workspace__analytics" aria-label="Research analytics">
            <app-analytics-panel
              [summary]="store.analyticsSummary()"
              [totalHits]="store.totalHits()"
              [isLoading]="store.isLoading()"
            >
              <app-publication-year-chart
                [distribution]="store.analyticsSummary().distribution"
                [datedCount]="store.analyticsSummary().datedCount"
                [missingDateCount]="store.analyticsSummary().missingDateCount"
              />
            </app-analytics-panel>
          </aside>
        </div>
      </div>
    </div>

    <app-paper-detail-dialog
      [paper]="selectedPaper()"
      (closeDialog)="closePaperDetail()"
    />
  `,
  styles: `
    @use '../../../styles/mixins' as *;

    .workspace {
      padding-top: var(--space-8);
    }

    .workspace__container {
      @include container;
    }

    .workspace__grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-6);
      align-items: start;

      @include respond-above($bp-desktop) {
        grid-template-columns: minmax(0, 1.85fr) minmax(300px, 1fr);
        gap: var(--space-8);
      }
    }

    .workspace__results {
      min-width: 0;
    }

    .workspace__body {
      margin-top: var(--space-5);
    }

    .paper-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .workspace__analytics {
      min-width: 0;

      @include respond-above($bp-desktop) {
        position: sticky;
        top: calc(var(--header-height) + var(--space-6));
      }
    }
  `,
})
export class ResearchExplorerPageComponent {
  protected readonly store = inject(ResearchSearchStore);
  protected readonly suggestionsService = inject(SearchSuggestionsService);
  protected readonly selectedPaper = signal<ResearchPaper | null>(null);

  protected onQueryDraftChange(draft: string): void {
    this.store.clearValidationError();
    this.suggestionsService.requestSuggestions(draft);
  }

  protected onSearchSubmit(payload: SearchSubmitPayload): void {
    this.suggestionsService.clear();
    this.store.submitSearch(payload.query, payload.limit);
  }

  protected onLimitChange(nextLimit: SupportedResultLimit): void {
    this.store.setLimit(nextLimit);
  }

  protected onSortChange(nextSort: ResearchSortOption): void {
    this.store.setSort(nextSort);
  }

  protected onClearSearch(): void {
    this.selectedPaper.set(null);
    this.suggestionsService.clear();
    this.store.clear();
  }

  protected onRetry(): void {
    this.store.retry();
  }

  protected onExportCsv(): void {
    const papers = this.store.papers();
    if (papers.length === 0) {
      return;
    }
    const csv = buildPapersCsv(papers);
    const filename = buildCsvFilename(this.store.activeQuery() || 'results');
    triggerCsvDownload(csv, filename);
  }

  protected openPaperDetail(paper: ResearchPaper): void {
    this.selectedPaper.set(paper);
  }

  protected closePaperDetail(): void {
    this.selectedPaper.set(null);
  }
}
