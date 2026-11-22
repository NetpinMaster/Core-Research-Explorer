import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import {
  ResearchSearchBarComponent,
  type SearchSubmitPayload,
} from './research-search-bar.component';

describe('ResearchSearchBarComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResearchSearchBarComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
  });

  it('renders required placeholder, syntax help toggle, and emits search payload on example click', () => {
    const fixture = TestBed.createComponent(ResearchSearchBarComponent);
    const emitted: SearchSubmitPayload[] = [];
    fixture.componentInstance.searchSubmit.subscribe((payload) => emitted.push(payload));
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector<HTMLInputElement>('#research-query-input');
    expect(input?.placeholder).toBe('Search papers, e.g. drone AND (package OR delivery)');

    const toggleBtn = el.querySelector<HTMLButtonElement>('.syntax-toggle');
    expect(toggleBtn?.getAttribute('aria-expanded')).toBe('false');
    toggleBtn?.click();
    fixture.detectChanges();
    expect(toggleBtn?.getAttribute('aria-expanded')).toBe('true');
    expect(el.querySelector('#boolean-syntax-help')).not.toBeNull();

    const exampleButtons = el.querySelectorAll<HTMLButtonElement>('.examples__btn');
    exampleButtons[3]?.click();
    fixture.detectChanges();

    expect(emitted).toEqual([
      { query: '(drone AND (package OR delivery))', limit: 20 },
    ]);
  });

  it('displays suggestions when focused and supports ArrowDown + Enter selection and Escape dismissal', () => {
    const fixture = TestBed.createComponent(ResearchSearchBarComponent);
    const emitted: SearchSubmitPayload[] = [];
    fixture.componentInstance.searchSubmit.subscribe((payload) => emitted.push(payload));

    fixture.componentRef.setInput('suggestions', [
      { label: 'drone delivery', completedQuery: 'drone delivery', matchCount: 5 },
      { label: 'drone swarm', completedQuery: 'drone swarm', matchCount: 2 },
    ]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector<HTMLInputElement>('#research-query-input')!;

    // Hidden before focus
    expect(el.querySelector('[data-testid="search-suggestions-listbox"]')).toBeNull();

    // Focus opens suggestions listbox
    input.dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();
    const listbox = el.querySelector('[data-testid="search-suggestions-listbox"]');
    expect(listbox).not.toBeNull();
    expect(el.querySelectorAll('[data-testid="search-suggestion-option"]').length).toBe(2);

    // ArrowDown highlights first option, Enter selects and submits it
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();
    expect(input.getAttribute('aria-activedescendant')).toBe('search-suggestion-0');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(emitted).toEqual([{ query: 'drone delivery', limit: 20 }]);
    expect(el.querySelector('[data-testid="search-suggestions-listbox"]')).toBeNull();

    // Typing re-enables menu and Escape dismisses it cleanly
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="search-suggestions-listbox"]')).not.toBeNull();

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="search-suggestions-listbox"]')).toBeNull();
  });

  it('exposes WCAG-compliant ARIA attributes on search input, search button, and control groups', () => {
    const fixture = TestBed.createComponent(ResearchSearchBarComponent);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector<HTMLInputElement>('#research-query-input')!;
    const submitBtn = el.querySelector<HTMLButtonElement>('[data-testid="search-submit-btn"]')!;
    const clearBtn = el.querySelector<HTMLButtonElement>('[data-testid="search-clear-btn"]')!;
    const examplesGroup = el.querySelector<HTMLElement>('.examples')!;

    expect(submitBtn.getAttribute('aria-label')).toBe('Search CORE research papers');
    expect(clearBtn.getAttribute('aria-label')).toBe('Clear search query and results');
    expect(examplesGroup.getAttribute('role')).toBe('group');
    expect(input.getAttribute('aria-haspopup')).toBe('listbox');
    // aria-controls must not reference a missing listbox while closed
    expect(input.getAttribute('aria-controls')).toBeNull();

    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();
    expect(submitBtn.getAttribute('aria-label')).toBe('Searching CORE research papers');
    expect(submitBtn.getAttribute('aria-busy')).toBe('true');

    fixture.componentRef.setInput('isLoading', false);
    fixture.componentRef.setInput('suggestions', [
      { label: 'drone delivery', completedQuery: 'drone delivery', matchCount: 3 },
    ]);
    input.dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();
    expect(input.getAttribute('aria-controls')).toBe('search-suggestions-listbox');
  });
});
