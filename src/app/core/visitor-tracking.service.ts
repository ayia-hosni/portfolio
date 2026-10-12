import { Injectable } from '@angular/core';

const TRACK_URL = 'https://backend.ayahosni.com/api/track';

@Injectable({ providedIn: 'root' })
export class VisitorTrackingService {
  trackPageView(): void {
    const payload = JSON.stringify({
      path: location.pathname,
      referrer: document.referrer || undefined,
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(TRACK_URL, blob);
      return;
    }

    fetch(TRACK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }
}
