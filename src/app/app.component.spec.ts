import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { routes } from './app.routes';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideZonelessChangeDetection(), provideRouter(routes)],
    }).compileComponents();
  });

  it('renders header wordmark, navigation links, and CORE footer attribution', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.top-bar__brand')?.textContent?.trim()).toBe(
      'CORE Research Explorer'
    );
    const navLinks = Array.from(element.querySelectorAll('.top-bar__link')).map((el) =>
      el.textContent?.trim()
    );
    expect(navLinks).toEqual(['Discover', 'Analytics']);
    expect(element.querySelector('footer')?.textContent).toContain(
      'CORE (Connecting Repositories)'
    );
  });
});
