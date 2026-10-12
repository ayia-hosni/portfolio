import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

type Word = { t: string; c: string };
type Greeting = { code: string; label: string; dir: 'ltr' | 'rtl'; cue: string; top: Word[]; bottom: Word[] };

// Restrained palette that matches the site: graphite pencil for the words, the brand colour only for the name
const NAME_PENCIL = 'var(--brand)';
const NAMES = ['Aya', 'آية'];
const colour = (words: string[]) =>
  words.map((t) => ({
    t,
    c: t === '—' ? 'var(--grey)' : NAMES.includes(t) ? NAME_PENCIL : 'var(--ink)',
  }));

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss',
})
export class HeroComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('hero', { static: true }) hero!: ElementRef<HTMLElement>;
  @ViewChild('stage', { static: true }) stage!: ElementRef<HTMLElement>;
  @ViewChild('imgWrap', { static: true }) imgWrap!: ElementRef<HTMLElement>;
  @ViewChild('sketch', { static: true }) sketch!: ElementRef<HTMLCanvasElement>;
  @ViewChild('trail', { static: true }) trail!: ElementRef<HTMLCanvasElement>;

  loaded = signal(false);

  /** the welcome goes above the portrait, the introduction ("I'm Aya") below it */
  greetings: Greeting[] = [
    { code: 'en', label: 'EN', dir: 'ltr', cue: 'scroll to meet me', top: colour(['Hi,', 'welcome!']), bottom: colour(["I'm", 'Aya']) },
    { code: 'ar', label: 'عربي', dir: 'rtl', cue: 'مرّر للأسفل لتتعرّف عليّ', top: colour(['مرحباً،', 'أهلاً', 'بك!']), bottom: colour(['أنا', 'آية']) },
    { code: 'fr', label: 'FR', dir: 'ltr', cue: 'faites défiler pour me découvrir', top: colour(['Bonjour,', 'bienvenue\u00A0!']), bottom: colour(['Je', 'suis', 'Aya']) },
  ];
  lang = signal(0);
  private greetTimers: number[] = [];
  hovering = signal(false);

  private frame = 0;
  private target = 0;
  private current = 0;
  private tiltFrame = 0;
  private trailFrame = 0;
  private sketchFrame = 0;
  private readyFn: () => void = () => {};
  private detailsOn = false;
  private countTimer = 0;
  private cleanup: Array<() => void> = [];

  constructor(private zone: NgZone) {}

  ngOnInit() {
    setTimeout(() => this.loaded.set(true), 80);
    this.playGreetings();
  }

  /** EN → AR → FR → back to EN, once. Skipped entirely for reduced motion. */
  private playGreetings() {
    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let t = 0;
    for (const [step, wait] of [[1, 3400], [2, 3600], [0, 3600]] as const) {
      t += wait;
      this.greetTimers.push(window.setTimeout(() => this.lang.set(step), t));
    }
  }

  /** choosing a language by hand stops the automatic tour */
  pickLang(i: number) {
    this.greetTimers.forEach(clearTimeout);
    this.greetTimers = [];
    this.lang.set(i);
  }

  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      const stage = this.stage.nativeElement;
      const ready = () => stage.classList.add('ready');
      this.readyFn = ready;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) ready();
      else setTimeout(ready, 7000);   // safety net if the sketch never completes
      this.initScroll();
      this.initTilt();
      this.initTrail();
      this.initSketch();
    });
  }

  ngOnDestroy() {
    this.greetTimers.forEach(clearTimeout);
    clearTimeout(this.countTimer);
    cancelAnimationFrame(this.frame);
    cancelAnimationFrame(this.tiltFrame);
    cancelAnimationFrame(this.trailFrame);
    cancelAnimationFrame(this.sketchFrame);
    this.cleanup.forEach((fn) => fn());
  }

  /** Scroll through the pinned hero drives --e (photo position) and --r (details reveal) */
  private initScroll() {
    const hero = this.hero.nativeElement;
    const stage = this.stage.nativeElement;

    const apply = (progress: number) => {
      const e = easeInOutCubic(progress);
      stage.style.setProperty('--e', e.toFixed(4));
      stage.classList.toggle('past-welcome', e > 0.3);
      // details sequence: switches on past ~30% of the reveal, off again below 10% (hysteresis: no flicker)
      const r = clamp01((e - 0.5) / 0.5);
      const on = this.detailsOn ? r > 0.1 : r > 0.3;
      if (on !== this.detailsOn) {
        this.detailsOn = on;
        stage.classList.toggle('details-in', on);
        this.countUp(on);
      }
      stage.style.setProperty('--r', clamp01((e - 0.5) / 0.5).toFixed(4));
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      apply(1);
      return;
    }

    const readTarget = () => {
      const rect = hero.getBoundingClientRect();
      const track = rect.height - window.innerHeight;
      this.target = clamp01(track > 0 ? -rect.top / track : 0);
      if (!this.frame) this.frame = requestAnimationFrame(step);
    };

    let last = performance.now();
    const step = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;
      this.current += (this.target - this.current) * (1 - Math.exp(-delta * 7));
      if (Math.abs(this.target - this.current) < 0.0005) this.current = this.target;
      apply(this.current);
      this.frame = this.current === this.target ? 0 : requestAnimationFrame(step);
    };

    window.addEventListener('scroll', readTarget, { passive: true });
    window.addEventListener('resize', readTarget);
    this.cleanup.push(() => {
      window.removeEventListener('scroll', readTarget);
      window.removeEventListener('resize', readTarget);
    });

    readTarget();
    this.current = this.target; // no animation from 0 when reloading mid-page
    apply(this.current);
  }

  /** 0 → value count-up for the stats; resets when the section hides again */
  private countUp(on: boolean) {
    const els = Array.from(this.stage.nativeElement.querySelectorAll<HTMLElement>('[data-to]'));
    const fmt = (el: HTMLElement, v: number) => `${v.toFixed(+(el.dataset['dec'] ?? 0))}${el.dataset['suffix'] ?? ''}`;
    clearTimeout(this.countTimer);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!on || reduced) {
      els.forEach((el) => (el.textContent = on || reduced ? fmt(el, +el.dataset['to']!) : fmt(el, 0)));
      return;
    }
    const start = performance.now() + 450;
    const dur = 1200;
    const tick = (now: number) => {
      const t = clamp01((now - start) / dur);
      const k = 1 - Math.pow(1 - t, 3);
      els.forEach((el) => (el.textContent = fmt(el, +el.dataset['to']! * k)));
      if (t < 1 && this.detailsOn) this.countTimer = window.setTimeout(() => tick(performance.now()), 16);
    };
    this.countTimer = window.setTimeout(() => tick(performance.now()), 16);
  }

  goTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  /** Photo roams the white space following the mouse (--tx/--ty in -1..1); CSS fades the effect out as the photo docks */
  private initTilt() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const hero = this.hero.nativeElement;
    const stage = this.stage.nativeElement;

    let tx = 0, ty = 0, x = 0, y = 0;

    const step = () => {
      x += (tx - x) * 0.06;
      y += (ty - y) * 0.06;
      stage.style.setProperty('--tx', x.toFixed(4));
      stage.style.setProperty('--ty', y.toFixed(4));
      const settled = Math.abs(tx - x) < 0.001 && Math.abs(ty - y) < 0.001;
      this.tiltFrame = settled ? 0 : requestAnimationFrame(step);
    };
    const kick = () => { if (!this.tiltFrame) this.tiltFrame = requestAnimationFrame(step); };

    const onMouse = (e: MouseEvent) => {
      const rect = hero.getBoundingClientRect();
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = ((e.clientY - Math.max(rect.top, 0)) / window.innerHeight) * 2 - 1;
      kick();
    };
    const onLeave = () => { tx = 0; ty = 0; kick(); };

    hero.addEventListener('mousemove', onMouse);
    hero.addEventListener('mouseleave', onLeave);
    this.cleanup.push(() => {
      hero.removeEventListener('mousemove', onMouse);
      hero.removeEventListener('mouseleave', onLeave);
    });

    // touch screens have no hovering pointer, so the photo drifts around the white space on its own while the welcome is showing
    if (window.matchMedia('(hover: none)').matches) {
      let raf = 0;
      const t0 = performance.now();
      const idle = (now: number) => {
        raf = requestAnimationFrame(idle);
        if (stage.classList.contains('past-welcome') || document.hidden) return;
        const t = (now - t0) / 1000;
        x = Math.sin(t * 0.7) * 0.55;
        y = Math.cos(t * 0.5) * 0.35;
        stage.style.setProperty('--tx', x.toFixed(4));
        stage.style.setProperty('--ty', y.toFixed(4));
      };
      raf = requestAnimationFrame(idle);
      this.cleanup.push(() => cancelAnimationFrame(raf));
    }
  }

  /**
   * Draws the photo as a pencil portrait: the image is inverted, blurred and colour-dodged back
   * onto itself (the classic pencil-sketch technique), then a pencil scribbles back and forth down
   * the page revealing it, before the real photo fades in.
   */
  private initSketch() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const wrap = this.imgWrap.nativeElement;
    const canvas = this.sketch.nativeElement;
    const photo = wrap.querySelector('.img-bw') as HTMLImageElement;
    const ctx = canvas.getContext('2d');
    if (!photo || !ctx) { wrap.classList.add('drawn'); this.readyFn(); return; }
    // The sketch is drawn from the original photo (white paper); the visible photo is the transparent cutout
    const img = new Image();
    img.src = 'profile-cutout.webp';   // transparent background: the drawing only exists where there is a person

    const W = 720, H = 960;
    canvas.width = W;
    canvas.height = H;
    const layer = () => {
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      return c;
    };

    const buildSketch = () => {
      const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
      // the cutout flattened onto white paper: the pencil-sketch maths needs a solid background to work against
      const flat = layer();
      const fc = flat.getContext('2d')!;
      fc.fillStyle = '#fff';
      fc.fillRect(0, 0, W, H);
      fc.drawImage(img, (W - dw) / 2, 0, dw, dh);
      const paint = (c: CanvasRenderingContext2D, filter: string) => {
        c.filter = filter;
        c.drawImage(flat, 0, 0);
        c.filter = 'none';
      };

      // line work: grayscale photo colour-dodged by its own inverted + blurred copy
      const lines = layer();
      const lc = lines.getContext('2d')!;
      // the cutout is lightened for the page, so push it back darker here to give the pencil something to draw
      const prep = 'grayscale(1) brightness(0.74) contrast(1.35)';
      paint(lc, prep);
      const inverted = layer();
      paint(inverted.getContext('2d')!, prep + ' invert(1) blur(4px)');
      lc.globalCompositeOperation = 'color-dodge';
      lc.drawImage(inverted, 0, 0);
      lc.globalCompositeOperation = 'source-over';

      const out = layer();
      const oc = out.getContext('2d')!;
      oc.filter = 'contrast(1.5) brightness(0.98)';
      oc.drawImage(lines, 0, 0);
      oc.filter = 'none';

      // soft graphite tone under the lines so hair and shirt have shading
      oc.globalCompositeOperation = 'multiply';
      oc.globalAlpha = 0.3;
      paint(oc, 'grayscale(1) blur(6px) contrast(1.1) brightness(1.45)');
      oc.globalAlpha = 1;

      // paper tooth
      const grain = oc.createImageData(W, H);
      for (let i = 0; i < W * H; i++) {
        const v = 246 + Math.random() * 9;   // subtle tooth, not dirt
        grain.data[i * 4] = grain.data[i * 4 + 1] = grain.data[i * 4 + 2] = v;
        grain.data[i * 4 + 3] = 255;
      }
      const g = layer();
      g.getContext('2d')!.putImageData(grain, 0, 0);
      oc.drawImage(g, 0, 0);

      // keep the drawing only where the transparent-background photo has a person (paper tooth and tone stay off the empty page)
      oc.globalCompositeOperation = 'destination-in';
      oc.filter = 'blur(1.2px)';
      oc.drawImage(img, (W - dw) / 2, 0, dw, dh);
      oc.filter = 'none';
      oc.globalCompositeOperation = 'source-over';
      return out;
    };

    const run = () => {
      const sketchImg = buildSketch();
      const mask = layer();
      const mctx = mask.getContext('2d')!;
      mctx.strokeStyle = '#fff';
      mctx.lineWidth = 68;
      mctx.lineCap = 'round';
      mctx.shadowColor = '#fff';
      mctx.shadowBlur = 14;

      const ROW = 34;                          // distance between scribble rows
      const rows = Math.ceil(H / ROW) + 1;
      const DURATION = 3600;
      const start = performance.now() + 400;
      let pen: { x: number; y: number } | null = null;

      const penAt = (t: number) => {
        const u = t * rows;
        const row = Math.min(Math.floor(u), rows - 1);
        const f = u - row;
        const x = (row % 2 ? 1 - f : f) * (W + 200) - 100;   // overshoot so the edges are fully covered
        const y = row * ROW + (x / W) * ROW * 0.6 + Math.sin(x * 0.05 + row) * 5;
        return { x, y };
      };

      const step = (now: number) => {
        const t = Math.min(Math.max((now - start) / DURATION, 0), 1);
        if (t > 0) {
          const next = penAt(t);
          if (pen) { mctx.beginPath(); mctx.moveTo(pen.x, pen.y); mctx.lineTo(next.x, next.y); mctx.stroke(); }
          pen = next;
        }

        // sketch × mask
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(sketchImg, 0, 0);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(mask, 0, 0);
        ctx.globalCompositeOperation = 'source-over';

        if (t < 1 && pen) this.drawPencil(ctx, Math.min(Math.max(pen.x, 30), W - 150), pen.y);

        if (t < 1) {
          this.sketchFrame = requestAnimationFrame(step);
        } else {
          // finish fully revealed, then crossfade into the real photo
          ctx.clearRect(0, 0, W, H);
          ctx.drawImage(sketchImg, 0, 0);
          wrap.classList.add('drawn');
          this.readyFn();                         // portrait done: the doodles start drawing
        }
      };
      this.sketchFrame = requestAnimationFrame(step);
    };

    if (img.complete && img.naturalWidth) run();
    else img.addEventListener('load', run, { once: true });
  }

  /** A small pencil whose tip sits at (x, y) */
  private drawPencil(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 4 - 0.15);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    // tip (wood + graphite)
    ctx.fillStyle = '#e9c9a0';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-12, -46); ctx.lineTo(12, -46); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3a3a46';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-4, -15); ctx.lineTo(4, -15); ctx.closePath(); ctx.fill();
    // body, ferrule, eraser
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#7a55dd';
    ctx.fillRect(-12, -190, 24, 144);
    ctx.fillStyle = '#c9ccd2';
    ctx.fillRect(-12, -204, 24, 14);
    ctx.fillStyle = '#f2a8b6';
    ctx.beginPath(); ctx.roundRect(-12, -226, 24, 22, 6); ctx.fill();
    ctx.restore();
  }

  /** Wherever the mouse goes, pencil-sketched clouds draw themselves stroke by stroke, then fade */
  private initTrail() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const hero = this.hero.nativeElement;
    const canvas = this.trail.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // cloud outline + a few shading strokes (viewBox 200 x 110)
    const BODY = 'M40 90 C15 90 8 62 32 56 C30 30 68 24 80 44 C90 14 135 14 142 46 C172 36 192 66 170 84 C168 88 164 90 158 90 Z';
    const HATCH = 'M58 74 q12 7 26 0 M96 66 q10 6 22 0 M128 76 q9 5 20 0';
    const bodyPath = new Path2D(BODY);
    const hatchPath = new Path2D(HATCH);
    const measure = (d: string) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      el.setAttribute('d', d);
      return el.getTotalLength();
    };
    const bodyLen = measure(BODY);
    const hatchLen = measure(HATCH);

    type Cloud = { x: number; y: number; size: number; rot: number; rgb: [number, number, number]; age: number };
    type Pt = { x: number; y: number; t: number };
    const clouds: Cloud[] = [];
    const points: Pt[] = [];
    const DRAW_MS = 1100;   // time to sketch one cloud
    const LIFE_MS = 3600;   // total time before it has faded away
    const POINT_LIFE = 700;
    let w = 0, h = 0, dpr = 1;
    let lastSpawn = { x: -999, y: -999 };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const onMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      points.push({ x, y, t: performance.now() });
      if (points.length > 40) points.shift();

      if (Math.hypot(x - lastSpawn.x, y - lastSpawn.y) > 170 && clouds.length < 7) {
        lastSpawn = { x, y };
        clouds.push({
          x, y,
          size: 150 + Math.random() * 110,
          rot: (Math.random() - 0.5) * 0.25,
          rgb: Math.random() < 0.5 ? [90, 160, 235] : [150, 105, 225], // light blue / purple pencil
          age: 0,
        });
      }
      if (!this.trailFrame) this.trailFrame = requestAnimationFrame(draw);
    };

    const sketch = (c: Cloud, dark: boolean) => {
      const t = Math.min(c.age / DRAW_MS, 1);
      const draw = 1 - Math.pow(1 - t, 2);                 // pencil slows toward the end
      const fade = c.age > LIFE_MS - 1000 ? (LIFE_MS - c.age) / 1000 : 1;
      const k = c.size / 200;
      const [r, g, b] = dark ? c.rgb.map((v) => Math.min(255, v + 60)) : c.rgb;

      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.scale(k, k);
      ctx.translate(-100, -55);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // two slightly different passes read as a hand-drawn, re-traced outline
      const passes = [
        { dx: 0, dy: 0, sc: 1, alpha: 0.85, width: 1.8 },
        { dx: 2, dy: -1.5, sc: 1.015, alpha: 0.4, width: 1.2 },
      ];
      for (const p of passes) {
        ctx.save();
        ctx.translate(p.dx + 100 * (1 - p.sc), p.dy + 55 * (1 - p.sc));
        ctx.scale(p.sc, p.sc);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${p.alpha * fade})`;
        ctx.lineWidth = p.width;
        ctx.setLineDash([bodyLen, bodyLen]);
        ctx.lineDashOffset = bodyLen * (1 - draw);
        ctx.stroke(bodyPath);
        ctx.restore();
      }

      // shading strokes appear once the outline is mostly done
      const hatch = Math.min(Math.max((t - 0.6) / 0.4, 0), 1);
      if (hatch > 0) {
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.5 * fade})`;
        ctx.lineWidth = 1.3;
        ctx.setLineDash([hatchLen, hatchLen]);
        ctx.lineDashOffset = hatchLen * (1 - hatch);
        ctx.stroke(hatchPath);
      }
      ctx.restore();
    };

    let prev = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(now - prev, 50);
      prev = now;
      ctx.clearRect(0, 0, w, h);
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';

      for (let i = clouds.length - 1; i >= 0; i--) {
        clouds[i].age += dt;
        if (clouds[i].age >= LIFE_MS) { clouds.splice(i, 1); continue; }
        sketch(clouds[i], dark);
      }

      // thin pencil line following the cursor
      while (points.length && now - points[0].t > POINT_LIFE) points.shift();
      ctx.setLineDash([]);
      ctx.lineCap = 'round';
      const ink = dark ? '237, 237, 237' : '60, 60, 60';
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i];
        const life = 1 - (now - b.t) / POINT_LIFE;
        if (life <= 0) continue;
        ctx.strokeStyle = `rgba(${ink}, ${life * 0.6})`;
        ctx.lineWidth = 0.6 + life * 1.2;
        ctx.beginPath();
        ctx.moveTo(a.x + Math.sin(a.t * 0.05), a.y + Math.cos(a.t * 0.05));
        ctx.lineTo(b.x + Math.sin(b.t * 0.05), b.y + Math.cos(b.t * 0.05));
        ctx.stroke();
      }

      this.trailFrame = clouds.length || points.length ? requestAnimationFrame(draw) : 0;
    };

    hero.addEventListener('mousemove', onMouse);
    this.cleanup.push(() => {
      hero.removeEventListener('mousemove', onMouse);
      window.removeEventListener('resize', resize);
    });
  }

  onMove(e: MouseEvent, el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - rect.left) + 'px');
    el.style.setProperty('--my', (e.clientY - rect.top) + 'px');
    if (!this.hovering()) this.hovering.set(true);
  }

  onLeave() {
    this.hovering.set(false);
  }
}
