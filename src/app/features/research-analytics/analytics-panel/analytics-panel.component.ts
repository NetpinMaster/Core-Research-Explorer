import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { ResearchAnalyticsSummary } from '../../../core/models/research-paper.model';

@Component({
  selector: 'app-analytics-panel',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="analytics-panel" aria-labelledby="analytics-panel-heading">
      <header class="analytics-panel__header">
        <h2 id="analytics-panel-heading" class="analytics-panel__title">
          Publication years of retrieved papers
        </h2>
        <p class="analytics-panel__scope">
          @if (summary().analysedCount > 0) {
            Calculated from the
            <span class="tabular-nums">{{ summary().analysedCount | number }}</span>
            retrieved works in the current result sample
            @if (totalHits() !== null) {
              (out of <span class="tabular-nums">{{ totalHits()! | number }}</span> total CORE matches).
            } @else {
              .
            }
          } @else {
            Run a search to inspect publication-year distribution across retrieved papers.
          }
        </p>
      </header>

      <dl class="kpi-grid">
        <div class="kpi-grid__item">
          <dt class="kpi-grid__label">Analysed papers</dt>
          <dd class="kpi-grid__value tabular-nums">
            {{ summary().analysedCount | number }}
          </dd>
        </div>

        <div class="kpi-grid__item">
          <dt class="kpi-grid__label">Earliest year</dt>
          <dd class="kpi-grid__value tabular-nums">
            {{ summary().earliestYear ?? '—' }}
          </dd>
        </div>

        <div class="kpi-grid__item">
          <dt class="kpi-grid__label">Latest year</dt>
          <dd class="kpi-grid__value tabular-nums">
            {{ summary().latestYear ?? '—' }}
          </dd>
        </div>

        <div class="kpi-grid__item">
          <dt class="kpi-grid__label">Missing dates</dt>
          <dd class="kpi-grid__value tabular-nums">
            {{ summary().missingDateCount | number }}
          </dd>
        </div>
      </dl>

      <div class="analytics-panel__chart-area" [class.analytics-panel__chart-area--tall]="expanded()">
        @if (isLoading()) {
          <div class="chart-placeholder" role="status" aria-label="Updating publication year analytics">
            <div class="chart-placeholder__bars" aria-hidden="true">
              <span style="height: 36%"></span>
              <span style="height: 58%"></span>
              <span style="height: 82%"></span>
              <span style="height: 64%"></span>
              <span style="height: 92%"></span>
              <span style="height: 48%"></span>
            </div>
            <p class="chart-placeholder__caption">Aggregating publication years...</p>
          </div>
        } @else if (summary().distribution.length === 0) {
          <div class="chart-empty">
            @if (summary().analysedCount > 0) {
              <p class="chart-empty__title">No valid publication years in sample</p>
              <p class="chart-empty__text">
                All
                <span class="tabular-nums">{{ summary().analysedCount | number }}</span>
                retrieved {{ summary().analysedCount === 1 ? 'paper' : 'papers' }} lacked a valid
                publication year in CORE metadata.
              </p>
            } @else {
              <p class="chart-empty__title">No publication-year data yet</p>
              <p class="chart-empty__text">
                Submit a keyword or Boolean query to populate the publication-year bar chart.
              </p>
            }
          </div>
        } @else {
          <ng-content />
        }
      </div>
    </section>
  `,
  styles: `
    @use '../../../../styles/mixins' as *;

    .analytics-panel {
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: var(--space-5);
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }

    .analytics-panel__header {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .analytics-panel__title {
      font-size: 1rem;
      font-weight: 700;
      color: var(--color-navy);
    }

    .analytics-panel__scope {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
      line-height: 1.5;
    }

    .kpi-grid {
      margin: 0;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      border-top: 1px solid var(--color-border);
      border-bottom: 1px solid var(--color-border);
    }

    .kpi-grid__item {
      padding: var(--space-3) var(--space-2);
      display: flex;
      flex-direction: column;
      gap: var(--space-1);

      &:nth-child(odd) {
        padding-left: 0;
        border-right: 1px solid var(--color-border);
        padding-right: var(--space-3);
      }

      &:nth-child(even) {
        padding-left: var(--space-3);
      }

      &:nth-child(1),
      &:nth-child(2) {
        border-bottom: 1px solid var(--color-border);
      }
    }

    .kpi-grid__label {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      font-weight: 500;
    }

    .kpi-grid__value {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .analytics-panel__chart-area {
      min-height: 240px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .analytics-panel__chart-area--tall {
      @include respond-above($bp-tablet) {
        min-height: 360px;
      }
    }

    .chart-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-3);
      height: 220px;
    }

    .chart-placeholder__bars {
      display: flex;
      align-items: flex-end;
      gap: var(--space-2);
      height: 110px;

      span {
        width: 18px;
        border-radius: 3px 3px 0 0;
        background-color: var(--color-surface-muted);
      }
    }

    .chart-placeholder__caption {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }

    .chart-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: var(--space-2);
      padding: var(--space-6) var(--space-3);
    }

    .chart-empty__title {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .chart-empty__text {
      max-width: 34ch;
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }
  `,
})
export class AnalyticsPanelComponent {
  readonly summary = input.required<ResearchAnalyticsSummary>();
  readonly totalHits = input<number | null>(null);
  readonly isLoading = input<boolean>(false);
  readonly expanded = input<boolean>(false);
}
