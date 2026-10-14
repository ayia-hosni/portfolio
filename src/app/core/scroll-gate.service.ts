import { Injectable } from '@angular/core';

/**
 * Holds downward scrolling for a moment at key points, so an animation can finish before the page moves on.
 * Scrolling up is never blocked, and nothing is held for people who prefer reduced motion.
 */
@Injectable({ providedIn: 'root' })
export class ScrollGateService {
  private until = 0;
  private timer = 0;
  private touchY = 0;
  private attached = false;

  get locked(): boolean {
    return performance.now() < this.until;
  }

  /** hold downward scrolling for `ms` (extends an existing hold if it would end sooner) */
  lock(ms: number) {
    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.attach();
    this.until = Math.max(this.until, performance.now() + ms);
    clearTimeout(this.timer);
    this.timer = window.setTimeout(() => (this.until = 0), Math.max(0, this.until - performance.now()) + 20);
  }

  unlock() {
    this.until = 0;
    clearTimeout(this.timer);
  }

  private attach() {
    if (this.attached) return;
    this.attached = true;
    const block = (e: Event) => { if (this.locked) e.preventDefault(); };
    window.addEventListener('wheel', (e) => { if (e.deltaY > 0) block(e); }, { passive: false });
    window.addEventListener('touchstart', (e) => { this.touchY = e.touches[0].clientY; }, { passive: true });
    window.addEventListener('touchmove', (e) => { if (e.touches[0].clientY < this.touchY) block(e); }, { passive: false });
    window.addEventListener('keydown', (e) => {
      const down = e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'End' || (e.key === ' ' && !e.shiftKey);
      if (down && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) block(e);
    });
  }
}
