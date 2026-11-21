import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
  Tooltip,
  type ChartConfiguration,
} from 'chart.js';
import type { YearDistributionPoint } from '../../../core/models/research-paper.model';
import { buildPublicationYearSeries } from '../../../shared/utilities/year-aggregation.util';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

interface ChartPalette {
  readonly barFill: string;
  readonly barHover: string;
  readonly gridLine: string;
  readonly tickText: string;
  readonly tooltipBg: string;
  readonly tooltipText: string;
  readonly fontSans: string;
  readonly fontMono: string;
}

function readChartPalette(): ChartPalette {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      barFill: '#2563eb',
      barHover: '#1d4ed8',
      gridLine: '#e2e8f0',
      tickText: '#475569',
      tooltipBg: '#14213d',
      tooltipText: '#ffffff',
      fontSans: "'Plus Jakarta Sans', sans-serif",
      fontMono: "'IBM Plex Mono', monospace",
    };
  }

  const styles = window.getComputedStyle(document.documentElement);
  const readVar = (name: string, fallback: string): string => {
    const value = styles.getPropertyValue(name).trim();
    return value.length > 0 ? value : fallback;
  };

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  return {
    barFill: readVar('--color-accent', '#2563eb'),
    barHover: readVar('--color-accent-hover', '#1d4ed8'),
    gridLine: readVar('--color-border', '#e2e8f0'),
    tickText: readVar('--color-text-secondary', '#475569'),
    tooltipBg: isDark ? '#0f172a' : readVar('--color-navy', '#14213d'),
    tooltipText: '#f8fafc',
    fontSans: readVar('--font-sans', "'Plus Jakarta Sans', sans-serif"),
    fontMono: readVar('--font-mono', "'IBM Plex Mono', monospace"),
  };
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

@Component({
  selector: 'app-publication-year-chart',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="year-chart" [class.year-chart--expanded]="expanded()">
      <div class="year-chart__canvas-wrap">
        <canvas
          #chartCanvas
          class="year-chart__canvas"
          role="img"
          [attr.aria-label]="chartAriaLabel()"
          data-testid="publication-year-canvas"
        ></canvas>
      </div>

      <div class="year-chart__meta">
        @if (series().peak; as peak) {
          <p class="year-chart__peak">
            Peak year in sample:
            <strong class="tabular-nums">{{ peak.year }}</strong>
            (<span class="tabular-nums">{{ peak.count | number }}</span>
            {{ peak.count === 1 ? 'paper' : 'papers' }})
          </p>
        }

        @if (missingDateCount() > 0) {
          <p class="year-chart__note">
            <span class="tabular-nums">{{ missingDateCount() | number }}</span>
            retrieved {{ missingDateCount() === 1 ? 'paper lacks' : 'papers lack' }} a valid
            publication year and {{ missingDateCount() === 1 ? 'is' : 'are' }} excluded from the
            bars above.
          </p>
        }

        @if (expanded()) {
          <div class="year-chart__table-controls">
            <button
              type="button"
              class="year-chart__toggle"
              [attr.aria-expanded]="showTable()"
              aria-controls="publication-year-data-table"
              (click)="toggleTable()"
            >
              {{ showTable() ? 'Hide year breakdown table' : 'Show year breakdown table' }}
            </button>
          </div>
        }
      </div>

      <div
        id="publication-year-data-table"
        class="year-chart__table-wrap"
        [class.sr-only]="!expanded() || !showTable()"
        data-testid="publication-year-table-wrap"
      >
        <table class="year-chart__table" data-testid="publication-year-table">
          <caption>
            Publication years of retrieved papers ({{ series().totalDated | number }} dated works)
          </caption>
          <thead>
            <tr>
              <th scope="col">Publication year</th>
              <th scope="col">Paper count</th>
              <th scope="col">Share of dated sample</th>
            </tr>
          </thead>
          <tbody>
            @for (point of distribution(); track point.year; let i = $index) {
              <tr class="tabular-nums">
                <th scope="row">{{ point.year }}</th>
                <td>{{ point.count | number }}</td>
                <td>{{ series().percentages[i] | number: '1.1-1' }}%</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: `
    @use '../../../../styles/mixins' as *;

    .year-chart {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      width: 100%;
      min-width: 0;
    }

    .year-chart__canvas-wrap {
      position: relative;
      width: 100%;
      min-width: 0;
      height: 230px;
      overflow: hidden;
    }

    .year-chart--expanded .year-chart__canvas-wrap {
      height: 280px;

      @include respond-above($bp-tablet) {
        height: 360px;
      }
    }

    .year-chart__canvas {
      display: block;
      width: 100%;
      height: 100%;
    }

    .year-chart__meta {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      padding-top: var(--space-3);
      border-top: 1px solid var(--color-border);
    }

    .year-chart__peak {
      font-size: 0.8125rem;
      color: var(--color-text-secondary);

      strong {
        color: var(--color-navy);
        font-weight: 600;
      }
    }

    .year-chart__note {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      line-height: 1.45;
    }

    .year-chart__table-controls {
      padding-top: var(--space-1);
    }

    .year-chart__toggle {
      padding: var(--space-1) var(--space-3);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-sm);
      background-color: var(--color-surface);
      color: var(--color-navy);
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;

      &:hover {
        border-color: var(--color-accent);
        color: var(--color-accent);
      }
    }

    .year-chart__table-wrap {
      width: 100%;
      overflow-x: auto;
    }

    .year-chart__table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8125rem;

      caption {
        text-align: left;
        font-weight: 600;
        color: var(--color-navy);
        padding-bottom: var(--space-2);
      }

      th,
      td {
        text-align: left;
        padding: var(--space-2) var(--space-3);
        border-bottom: 1px solid var(--color-border);
        color: var(--color-text-secondary);
      }

      thead th {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--color-text-muted);
        background-color: var(--color-surface-muted);
      }

      tbody th {
        font-weight: 600;
        color: var(--color-text-primary);
      }
    }
  `,
})
export class PublicationYearChartComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('chartCanvas');

  readonly distribution = input.required<readonly YearDistributionPoint[]>();
  readonly datedCount = input<number>(0);
  readonly missingDateCount = input<number>(0);
  readonly expanded = input<boolean>(false);

  protected readonly showTable = signal<boolean>(false);
  private readonly themeRevision = signal<number>(0);

  protected readonly series = computed(() => buildPublicationYearSeries(this.distribution()));

  protected readonly chartAriaLabel = computed(() => {
    const points = this.distribution();
    if (points.length === 0) {
      return 'Publication years of retrieved papers chart with no dated records';
    }
    const firstYear = points[0].year;
    const lastYear = points[points.length - 1].year;
    const total = this.datedCount() || this.series().totalDated;
    const yearRange = firstYear === lastYear ? `year ${firstYear}` : `years ${firstYear} to ${lastYear}`;
    return `Bar chart showing publication years of ${total} retrieved papers across ${yearRange}.`;
  });

  private chartInstance: Chart<'bar', number[], string> | null = null;

  constructor() {
    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
      const observer = new MutationObserver(() => {
        this.themeRevision.update((value) => value + 1);
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });
      this.destroyRef.onDestroy(() => observer.disconnect());
    }

    effect(() => {
      const canvasEl = this.canvasRef()?.nativeElement;
      const currentSeries = this.series();
      const isExpanded = this.expanded();
      // Track theme changes so colors update automatically when light/dark mode toggles.
      this.themeRevision();

      if (!canvasEl || currentSeries.labels.length === 0) {
        this.destroyChart();
        return;
      }

      this.renderOrUpdateChart(canvasEl, currentSeries, isExpanded);
    });

    this.destroyRef.onDestroy(() => {
      this.destroyChart();
    });
  }

  protected toggleTable(): void {
    this.showTable.update((open) => !open);
  }

  private renderOrUpdateChart(
    canvasEl: HTMLCanvasElement,
    series: ReturnType<typeof buildPublicationYearSeries>,
    isExpanded: boolean
  ): void {
    let context: CanvasRenderingContext2D | null = null;
    try {
      context = canvasEl.getContext('2d');
    } catch {
      // Non-canvas test environments (e.g. jsdom without node-canvas) safely skip canvas painting.
      return;
    }

    if (!context) {
      return;
    }

    const palette = readChartPalette();
    const config = this.buildChartConfig(series, palette, isExpanded);

    if (this.chartInstance) {
      this.chartInstance.data = config.data;
      if (config.options) {
        this.chartInstance.options = config.options;
      }
      this.chartInstance.update(prefersReducedMotion() ? 'none' : undefined);
      return;
    }

    this.chartInstance = new Chart(context, config);
  }

  private buildChartConfig(
    series: ReturnType<typeof buildPublicationYearSeries>,
    palette: ChartPalette,
    isExpanded: boolean
  ): ChartConfiguration<'bar', number[], string> {
    const labels = [...series.labels];
    const counts = [...series.counts];
    const percentages = series.percentages;

    return {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Retrieved papers',
            data: counts,
            backgroundColor: palette.barFill,
            hoverBackgroundColor: palette.barHover,
            borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
            borderSkipped: 'bottom',
            maxBarThickness: isExpanded ? 42 : 30,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: prefersReducedMotion() ? 0 : 180,
        },
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: palette.tooltipBg,
            titleColor: palette.tooltipText,
            bodyColor: palette.tooltipText,
            padding: 10,
            cornerRadius: 6,
            displayColors: false,
            titleFont: {
              family: palette.fontMono,
              size: 12,
              weight: 600,
            },
            bodyFont: {
              family: palette.fontSans,
              size: 12,
            },
            callbacks: {
              title: (items) => {
                const year = items[0]?.label;
                return year ? `Publication year ${year}` : '';
              },
              label: (ctx) => {
                const count = typeof ctx.parsed.y === 'number' ? ctx.parsed.y : 0;
                const pct = percentages[ctx.dataIndex] ?? 0;
                const noun = count === 1 ? 'paper' : 'papers';
                return `${count.toLocaleString()} ${noun} (${pct.toFixed(1)}% of dated sample)`;
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Publication year',
              color: palette.tickText,
              font: {
                family: palette.fontSans,
                size: 11,
                weight: 500,
              },
              padding: { top: 6 },
            },
            grid: {
              display: false,
            },
            border: {
              color: palette.gridLine,
            },
            ticks: {
              color: palette.tickText,
              autoSkip: true,
              maxTicksLimit: isExpanded ? 16 : 8,
              maxRotation: 45,
              minRotation: 0,
              font: {
                family: palette.fontMono,
                size: 11,
              },
            },
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Papers',
              color: palette.tickText,
              font: {
                family: palette.fontSans,
                size: 11,
                weight: 500,
              },
            },
            grid: {
              color: palette.gridLine,
            },
            border: {
              display: false,
            },
            ticks: {
              precision: 0,
              color: palette.tickText,
              font: {
                family: palette.fontMono,
                size: 11,
              },
            },
          },
        },
      },
    };
  }

  private destroyChart(): void {
    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }
  }
}
