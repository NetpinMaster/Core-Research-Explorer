import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ResearchSearchStore } from '../../core/services/research-search.store';
import { AnalyticsPanelComponent } from './analytics-panel/analytics-panel.component';
import { PublicationYearChartComponent } from './publication-year-chart/publication-year-chart.component';

@Component({
  selector: 'app-analytics-page',
  standalone: true,
  imports: [RouterLink, AnalyticsPanelComponent, PublicationYearChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="analytics-page" aria-labelledby="analytics-heading">
      <div class="analytics-page__container">
        <header class="analytics-page__header">
          <div>
            <h1 id="analytics-heading" class="analytics-page__title">
              Research Publication Analytics
            </h1>
            <p class="analytics-page__subtitle">
              @if (store.activeQuery()) {
                Showing sample publication-year statistics for query
                <span class="analytics-page__query">"{{ store.activeQuery() }}"</span>.
              } @else {
                Inspect publication-year distributions and date completeness for your active CORE
                search sample.
              }
            </p>
          </div>

          <a routerLink="/" class="analytics-page__back">Back to search</a>
        </header>

        <app-analytics-panel
          [summary]="store.analyticsSummary()"
          [totalHits]="store.totalHits()"
          [isLoading]="store.isLoading()"
          [expanded]="true"
        >
          <app-publication-year-chart
            [distribution]="store.analyticsSummary().distribution"
            [datedCount]="store.analyticsSummary().datedCount"
            [missingDateCount]="store.analyticsSummary().missingDateCount"
            [expanded]="true"
          />
        </app-analytics-panel>
      </div>
    </section>
  `,
  styles: `
    @use '../../../styles/mixins' as *;

    .analytics-page {
      padding-block: var(--space-8);

      @include respond-above($bp-desktop) {
        padding-block: var(--space-10);
      }
    }

    .analytics-page__container {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
      @include container;
    }

    .analytics-page__header {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);

      @include respond-above($bp-tablet) {
        flex-direction: row;
        align-items: flex-end;
        justify-content: space-between;
      }
    }

    .analytics-page__title {
      font-size: clamp(1.625rem, 3vw, 2.25rem);
      font-weight: 700;
      letter-spacing: -0.025em;
      color: var(--color-navy);
      margin-bottom: var(--space-2);
    }

    .analytics-page__subtitle {
      max-width: 64ch;
      color: var(--color-text-secondary);
      font-size: 0.96875rem;
    }

    .analytics-page__query {
      font-family: var(--font-mono);
      font-size: 0.875rem;
      color: var(--color-navy);
    }

    .analytics-page__back {
      align-self: flex-start;
      padding: var(--space-2) var(--space-4);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
      background-color: var(--color-surface);
      color: var(--color-navy);
      font-size: 0.875rem;
      font-weight: 600;
      white-space: nowrap;
      text-decoration: none;

      &:hover {
        border-color: var(--color-accent);
        color: var(--color-accent);
        text-decoration: none;
      }

      @include respond-above($bp-tablet) {
        align-self: auto;
      }
    }
  `,
})
export class AnalyticsPageComponent {
  protected readonly store = inject(ResearchSearchStore);
}
