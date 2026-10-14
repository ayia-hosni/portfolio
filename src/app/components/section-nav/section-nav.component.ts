import { AfterViewInit, Component, NgZone, OnDestroy, signal } from '@angular/core';
import { ScrollGateService } from '../../core/scroll-gate.service';

interface Stop {
  label: string;
  el: HTMLElement;
  /** space to leave above the element when scrolling to it (fixed navbar) */
  offset: number;
}

/**
 * Floating "previous / next" arrows for the whole page. The stops are the sections plus each project
 * card, so the arrows step Welcome → … → Experience → Project 01 → 02 → 03 → Contact.
 */
@Component({
  selector: 'app-section-nav',
  standalone: true,
  template: `
    <nav class="snav" [class.ready]="ready()" [class.top]="atTop()" aria-label="Page sections">
      <button type="button" class="arrow up" (click)="go(-1)" [disabled]="index() <= 0"
              [attr.aria-label]="index() > 0 ? 'Previous: ' + labels()[index() - 1] : 'Top of the page'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>
        @if (index() > 0) { <span class="tip" aria-hidden="true">{{ labels()[index() - 1] }}</span> }
      </button>

      <span class="pos" aria-live="polite">
        <b>{{ pad(index() + 1) }}</b><i></i><span>{{ pad(labels().length) }}</span>
      </span>

      <button type="button" class="arrow down" (click)="go(1)" [disabled]="index() >= labels().length - 1"
              [attr.aria-label]="index() < labels().length - 1 ? 'Next: ' + labels()[index() + 1] : 'End of the page'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
        @if (index() < labels().length - 1) { <span class="tip" aria-hidden="true">{{ labels()[index() + 1] }}</span> }
      </button>
    </nav>
  `,
  styles: [`
    :host { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; }

    .snav {
      position: fixed;
      right: 1rem;
      bottom: 1.25rem;
      z-index: 90;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 5px;
      border: 1.5px solid var(--ink);
      border-radius: 999px;
      background: color-mix(in srgb, var(--bg) 92%, transparent);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      box-shadow: 0 14px 30px -18px color-mix(in srgb, var(--ink) 60%, transparent);
      opacity: 0;
      transform: translateY(14px) scale(0.92);
      transition: opacity 0.4s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
      pointer-events: none;
    }
    .snav.ready { opacity: 1; transform: none; pointer-events: auto; }

    .arrow {
      position: relative;
      width: 38px;
      height: 38px;
      display: grid;
      place-items: center;
      border: 0;
      border-radius: 50%;
      background: transparent;
      color: var(--ink);
      cursor: pointer;
      transition: background 0.2s, color 0.2s, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      svg { transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }

      &:hover:not(:disabled) { background: var(--ink); color: var(--bg); }
      &.up:hover:not(:disabled) svg { transform: translateY(-2px); }
      &.down:hover:not(:disabled) svg { transform: translateY(2px); }
      &:active:not(:disabled) { transform: scale(0.92); }
      &:disabled { opacity: 0.3; cursor: default; }
      &:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }

      /* destination label, to the left of the arrow */
      .tip {
        position: absolute;
        right: calc(100% + 12px);
        top: 50%;
        translate: 8px -50%;
        padding: 0.4rem 0.8rem;
        border: 1.5px solid var(--ink);
        border-radius: 999px;
        background: var(--bg);
        color: var(--ink);
        font-size: 12px;
        font-weight: 650;
        letter-spacing: -0.005em;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease, translate 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
      }
      &:hover .tip, &:focus-visible .tip, &:active .tip { opacity: 1; translate: 0 -50%; }
    }

    .pos {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      font-family: 'SF Mono', 'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace;
      font-size: 10px;
      line-height: 1;
      color: var(--grey);
      b { color: var(--ink); font-size: 12px; font-weight: 700; }
      i { width: 12px; height: 1.5px; background: color-mix(in srgb, var(--ink) 30%, transparent); }
    }

    @media (max-width: 700px) {
      .snav {
        right: calc(0.5rem + env(safe-area-inset-right, 0px));
        bottom: calc(0.7rem + env(safe-area-inset-bottom, 0px));
        gap: 2px;
        padding: 3px;
        background: color-mix(in srgb, var(--bg) 78%, transparent);
        border-width: 1px;
      }
      .snav.top { opacity: 0; transform: translateY(14px) scale(0.92); pointer-events: none; }
      .arrow { width: 36px; height: 36px; .tip { display: none; } }
      .pos { display: none; }
    }
    /* touch screens: comfortable 44px targets */
    @media (pointer: coarse) { .arrow { width: 44px; height: 44px; } }
    @media (prefers-reduced-motion: reduce) {
      .snav, .arrow, .arrow svg, .arrow .tip { transition: none; }
    }
  `],
})
export class SectionNavComponent implements AfterViewInit, OnDestroy {
  index = signal(0);
  labels = signal<string[]>(['Welcome']);
  ready = signal(false);
  /** still on the welcome screen: phones hide the arrows there (they would cover the greeting) */
  atTop = signal(true);

  private cleanup: Array<() => void> = [];

  constructor(private zone: NgZone, private gate: ScrollGateService) {}

  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      let raf = 0;
      const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; this.update(); }); };
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
      this.cleanup.push(() => { window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); cancelAnimationFrame(raf); });
      // the other sections render after this one, so collect the stops once everything is in the DOM
      setTimeout(() => this.update(), 400);
      setTimeout(() => this.zone.run(() => this.ready.set(true)), 900);
    });
  }

  ngOnDestroy() {
    this.cleanup.forEach((fn) => fn());
  }

  pad(n: number) {
    return String(n).padStart(2, '0');
  }

  /** Sections, then each project card (title from the card), in page order. */
  private collect(): Stop[] {
    const stops: Stop[] = [];
    const add = (label: string, sel: string, offset: number) => {
      const el = document.querySelector<HTMLElement>(sel);
      if (el && el.offsetParent !== null) stops.push({ label, el, offset });
    };
    add('Welcome', '#top', 0);
    add('The letter A', 'app-split-intro .split', 0);
    add('How I build', '#about', 70);
    add('Experience', '#experience', 70);
    add('OFOQ', '#brmja', 70);
    add('KeelWorks', '#keel', 70);
    add('Projects', '#work', 70);
    document.querySelectorAll<HTMLElement>('app-projects .projects > *').forEach((el) => {
      const title = el.querySelector('h3')?.textContent?.trim() ?? 'Project';
      const num = el.querySelector('.num')?.textContent?.trim();
      // the pinned card's wrapper sticks 80px from the top, so land exactly there
      stops.push({ label: num ? `${num} · ${title}` : title, el, offset: el.classList.contains('pin') ? 80 : 90 });
    });
    add('Contact', '#contact', 70);
    return stops.sort((a, b) => this.top(a) - this.top(b));
  }

  private top(s: Stop) {
    return s.el.getBoundingClientRect().top + window.scrollY - s.offset;
  }

  private update() {
    const stops = this.collect();
    const y = window.scrollY;
    const top = y < window.innerHeight * 0.5;
    if (top !== this.atTop()) this.zone.run(() => this.atTop.set(top));
    const atBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 4;
    let idx = 0;
    stops.forEach((s, i) => { if (this.top(s) <= y + 60) idx = i; });
    if (atBottom) idx = stops.length - 1;
    this.zone.run(() => {
      const labels = stops.map((s) => s.label);
      if (labels.join('|') !== this.labels().join('|')) this.labels.set(labels);
      if (idx !== this.index()) this.index.set(idx);
    });
  }

  go(dir: 1 | -1) {
    if (dir === 1 && this.gate.locked) return;      // let the current section finish first
    const stops = this.collect();
    const y = window.scrollY;
    // current = last stop at or above the viewport top; moving forward lands on the next, back on the previous
    let cur = 0;
    stops.forEach((s, i) => { if (this.top(s) <= y + 60) cur = i; });
    const atStart = Math.abs(this.top(stops[cur]) - y) < 80;
    const target = dir === 1 ? stops[Math.min(stops.length - 1, cur + 1)] : stops[Math.max(0, atStart ? cur - 1 : cur)];
    window.scrollTo({ top: Math.max(0, this.top(target)), behavior: 'smooth' });
  }
}
