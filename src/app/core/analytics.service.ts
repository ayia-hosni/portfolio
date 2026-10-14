import { Injectable } from '@angular/core';

declare global {
  interface Window { umami?: { track: (name: string, data?: Record<string, string | number>) => void } }
}

/**
 * Thin wrapper over Umami's tracker. `once` events fire at most once per browser session, so scrolling back and forth
 * (or re-opening a section) never counts as a second qualified action. Does nothing if the tracker is not loaded
 * (blocked, or another host), and never records that it fired in that case.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private fired = new Set<string>();

  trackOnce(name: string, data?: Record<string, string | number>) {
    const key = name + ':' + JSON.stringify(data ?? {});
    if (this.fired.has(key) || this.seen(key)) return;
    if (!window.umami?.track) return;
    window.umami.track(name, data);
    this.fired.add(key);
    this.remember(key);
  }

  private seen(key: string): boolean {
    try { return sessionStorage.getItem('an:' + key) === '1'; } catch { return false; }
  }
  private remember(key: string) {
    try { sessionStorage.setItem('an:' + key, '1'); } catch { /* storage blocked: the in-memory set still guards this page load */ }
  }
}
