import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  Output,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ArchitectureDiagram } from '../projects/architecture-diagrams.data';

let mermaidModulePromise: Promise<typeof import('mermaid')> | null = null;
const loadMermaid = () => (mermaidModulePromise ??= import('mermaid'));

/**
 * The architecture diagrams as slides that live inside a project card. The parent pins the card and
 * tells this viewer which slide to show (`active`); each diagram draws itself on a sketch-paper canvas.
 * Timeline on the left is the same language as "How I build".
 */
@Component({
  selector: 'app-architecture-story',
  standalone: true,
  templateUrl: './architecture-story.component.html',
  styleUrl: './architecture-story.component.scss',
})
export class ArchitectureStoryComponent implements AfterViewInit, OnDestroy {
  @Input() title = '';
  @Input() diagrams: ArchitectureDiagram[] = [];
  /** which slide to show; the parent passes -1 while the card's intro is showing */
  @Input() set active(v: number) {
    const i = Math.max(0, v);
    if (i !== this.activeIdx()) { this.zoom.set(1); this.activeIdx.set(i); }
    if (this.armedFlag) { this.ensure(i); this.ensure(i + 1); }
  }
  /** set by the parent shortly before the card reaches the screen: start rendering */
  @Input() set armed(v: boolean) {
    this.armedFlag = v;
    if (v) {
      this.ensure(this.activeIdx());
      if (this.staticMode()) this.diagrams.forEach((d, i) => this.ensure(i));
    }
  }
  /** a timeline title was clicked */
  @Output() jump = new EventEmitter<number>();

  private host = inject(ElementRef<HTMLElement>);
  private armedFlag = false;
  activeIdx = signal(0);
  seen = signal<Set<number>>(new Set());

  isOn(i: number) {
    return this.staticMode() ? this.seen().has(i) : i === this.activeIdx();
  }
  svgs = signal<Record<string, SafeHtml>>({});
  failed = signal<Record<string, boolean>>({});
  staticMode = signal(false);
  zoom = signal(1);
  readonly zoomLevels = [1, 1.5, 2, 3, 4];
  readonly maxZoom = 4;

  private cleanup: Array<() => void> = [];
  private queue: Promise<void> = Promise.resolve();
  private rendering = new Set<string>();
  private renderEpoch = 0;
  private static readonly STATIC_LAYOUT = '(max-height: 520px), (prefers-reduced-motion: reduce)';

  constructor(private zone: NgZone, private sanitizer: DomSanitizer) {
    // when the active slide's diagram is in the DOM, draw it in
    effect(() => {
      const stacked = this.staticMode();
      this.seen();
      const i = this.activeIdx();
      const ready = !!this.svgs()[this.diagrams[i]?.id];
      if (stacked) setTimeout(() => this.animateInline(), 60);
      else if (ready) setTimeout(() => this.animate(i), 60);
    });
  }

  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      const mq = window.matchMedia(ArchitectureStoryComponent.STATIC_LAYOUT);
      const syncMode = () => this.zone.run(() => {
        this.staticMode.set(mq.matches);
        if (mq.matches && this.armedFlag) this.diagrams.forEach((d, i) => this.ensure(i));
      });
      syncMode();
      mq.addEventListener('change', syncMode);

      const io = new IntersectionObserver(
        (entries) => {
          const fresh = entries.filter((e) => e.isIntersecting).map((e) => +(e.target as HTMLElement).dataset['i']!);
          if (fresh.length) this.zone.run(() => this.seen.update((s) => new Set([...s, ...fresh])));
        },
        { threshold: 0.2, rootMargin: '0px 0px -6% 0px' }
      );
      const watch = () => (this.host.nativeElement as HTMLElement).querySelectorAll('.step').forEach((el) => io.observe(el));
      watch();
      setTimeout(watch, 500);
      this.cleanup.push(() => io.disconnect());

      // light/dark switch: re-render with the matching palette
      const mo = new MutationObserver(() => {
        this.renderEpoch++;
        this.svgs.set({});
        this.zone.run(() => {
          this.ensure(this.activeIdx());
          if (this.staticMode()) this.diagrams.forEach((d, i) => this.ensure(i));
        });
      });
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

      this.cleanup.push(() => { mq.removeEventListener('change', syncMode); mo.disconnect(); });
    });
  }

  ngOnDestroy() {
    this.cleanup.forEach((fn) => fn());
  }

  pad(n: number) {
    return String(n).padStart(2, '0');
  }

  goTo(i: number) {
    if (!this.staticMode()) this.jump.emit(i);
  }

  zoomIn() {
    const i = this.zoomLevels.indexOf(this.zoom());
    this.zoom.set(this.zoomLevels[Math.min(this.zoomLevels.length - 1, i + 1)]);
  }
  zoomOut() {
    const i = this.zoomLevels.indexOf(this.zoom());
    this.zoom.set(this.zoomLevels[Math.max(0, i - 1)]);
  }
  zoomFit() {
    this.zoom.set(1);
  }

  // drag-to-pan once zoomed in
  private drag: { x: number; y: number; sl: number; st: number } | null = null;
  onPanStart(e: PointerEvent) {
    if (this.zoom() <= 1) return;
    const el = e.currentTarget as HTMLElement;
    this.drag = { x: e.clientX, y: e.clientY, sl: el.scrollLeft, st: el.scrollTop };
    el.setPointerCapture(e.pointerId);
    el.classList.add('panning');
  }
  onPanMove(e: PointerEvent) {
    if (!this.drag) return;
    const el = e.currentTarget as HTMLElement;
    el.scrollLeft = this.drag.sl - (e.clientX - this.drag.x);
    el.scrollTop = this.drag.st - (e.clientY - this.drag.y);
  }
  onPanEnd(e: PointerEvent) {
    this.drag = null;
    (e.currentTarget as HTMLElement).classList.remove('panning');
  }

  // ───────────── rendering ─────────────
  private ensure(i: number) {
    const d = this.diagrams[i];
    if (!d || this.svgs()[d.id] || this.rendering.has(d.id)) return;
    this.rendering.add(d.id);
    const epoch = this.renderEpoch;
    // mermaid keeps global state, so renders are strictly one after another
    this.queue = this.queue.then(async () => {
      try {
        const svg = await this.renderDiagram(d);
        if (epoch === this.renderEpoch) this.svgs.update((m) => ({ ...m, [d.id]: this.sanitizer.bypassSecurityTrustHtml(svg) }));
      } catch {
        if (epoch === this.renderEpoch) this.failed.update((m) => ({ ...m, [d.id]: true }));
      } finally {
        this.rendering.delete(d.id);
        if (epoch !== this.renderEpoch) this.ensure(this.activeIdx());
      }
    });
  }

  private async renderDiagram(d: ArchitectureDiagram): Promise<string> {
    const mermaid = (await loadMermaid()).default;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    // same palette as the rest of the site: soft blue / purple fills, graphite lines, Inter text
    const v = isDark
      ? { primary: '#2f4a6b', secondary: '#4b3b7c', tertiary: '#1b1b22', text: '#ededed', border: '#d6d6dc', line: '#a8a8b3', cluster: '#17171c', note: '#2c2640' }
      : { primary: '#cfe6ff', secondary: '#e1d6ff', tertiary: '#f4f6ff', text: '#222222', border: '#2a2a33', line: '#5a5a66', cluster: '#fafaff', note: '#efe8ff' };
    const font = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'strict',
      fontFamily: font,
      flowchart: { curve: 'basis', padding: 14, nodeSpacing: 46, rankSpacing: 54 },
      themeVariables: {
        fontFamily: font, fontSize: '14px', background: 'transparent',
        primaryColor: v.primary, primaryTextColor: v.text, primaryBorderColor: v.border,
        secondaryColor: v.secondary, secondaryTextColor: v.text, secondaryBorderColor: v.border,
        tertiaryColor: v.tertiary, tertiaryTextColor: v.text, tertiaryBorderColor: v.line,
        lineColor: v.line, textColor: v.text, mainBkg: v.primary, nodeBorder: v.border,
        clusterBkg: v.cluster, clusterBorder: v.line, edgeLabelBackground: isDark ? '#0e0e0e' : '#ffffff',
        titleColor: v.text,
        actorBkg: v.primary, actorBorder: v.border, actorTextColor: v.text, actorLineColor: v.line,
        signalColor: v.line, signalTextColor: v.text,
        labelBoxBkgColor: v.secondary, labelBoxBorderColor: v.border, labelTextColor: v.text, loopTextColor: v.text,
        noteBkgColor: v.note, noteTextColor: v.text, noteBorderColor: v.line,
        activationBkgColor: v.secondary, activationBorderColor: v.border,
      },
    });
    const { svg } = await mermaid.render(`arch-${d.id}-${Date.now()}`, d.definition);
    return svg;
  }

  /** nodes pop in, edges trace themselves, labels fade (dashed edges keep their dash pattern) */
  private animate(i: number) {
    if (i !== this.activeIdx() || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = this.host.nativeElement.querySelector('.canvas .mermaid-output svg:not(.go)') as SVGElement | null;
    if (root) this.animateRoot(root);
  }

  /** stacked layout: animate the inline diagram of every step that has scrolled into view */
  private animateInline() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const steps = (this.host.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.step');
    steps.forEach((step) => {
      if (!this.seen().has(+step.dataset['i']!)) return;
      const root = step.querySelector('.inline-canvas .mermaid-output svg:not(.go)') as SVGElement | null;
      if (root) this.animateRoot(root);
    });
  }

  private animateRoot(root: SVGElement) {

    root.querySelectorAll<SVGElement>('.node, .cluster, .actor, .note').forEach((n, k) => {
      n.style.setProperty('--d', `${Math.min(k * 35, 700)}ms`);
      n.classList.add('pop');
      if (/(^|[-_])(\w*db|kafka|rabbit\w*|redis|queue|topic|store|postgres\w*)([-_]|$)/i.test(n.id || '')) n.classList.add('alt');
    });
    root.querySelectorAll<SVGGeometryElement>('path.flowchart-link, .messageLine0, line.messageLine0, .actor-line').forEach((e, k) => {
      if (getComputedStyle(e).strokeDasharray !== 'none') return;
      e.setAttribute('pathLength', '1');
      e.style.setProperty('--d', `${450 + Math.min(k * 40, 900)}ms`);
      e.classList.add('draw');
    });
    root.querySelectorAll<SVGElement>('.edgeLabel, .messageText, .labelText, .loopText').forEach((l, k) => {
      l.style.setProperty('--d', `${900 + Math.min(k * 30, 600)}ms`);
      l.classList.add('fade');
    });
    root.getBoundingClientRect();
    requestAnimationFrame(() => root.classList.add('go'));
  }
}
