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
import { ScrollGateService } from '../../core/scroll-gate.service';

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
  @ViewChild('trail', { static: true }) trail!: ElementRef<HTMLCanvasElement>;

  loaded = signal(false);

  /** the welcome goes above the portrait, the introduction ("I'm Aya") below it */
  greetings: Greeting[] = [
    { code: 'en', label: 'EN', dir: 'ltr', cue: 'scroll to meet me', top: colour(['Hi,', 'welcome!']), bottom: colour(["I'm", 'Aya']) },
    { code: 'ar', label: 'عربي', dir: 'rtl', cue: 'مرّر للأسفل لتتعرّف عليّ', top: colour(['مرحباً،', 'أهلاً', 'بك!']), bottom: colour(['أنا', 'آية']) },
    { code: 'de', label: 'DE', dir: 'ltr', cue: 'scroll, um mich kennenzulernen', top: colour(['Hallo,', 'willkommen!']), bottom: colour(['Ich', 'bin', 'Aya']) },
  ];
  lang = signal(0);
  private greetTimers: number[] = [];
  hovering = signal(false);

  private frame = 0;
  private target = 0;
  private current = 0;
  private trailFrame = 0;
  private detailsOn = false;
  private detailsAt = 0;          // when the details sequence started
  private gateArmed = true;       // hold the scroll once per visit to the fully-docked state
  private cleanup: Array<() => void> = [];

  constructor(private zone: NgZone, private gate: ScrollGateService) {}

  ngOnInit() {
    setTimeout(() => this.loaded.set(true), 80);
    this.playGreetings();
  }

  /** EN → AR → DE → back to EN, once. Skipped entirely for reduced motion. */
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
      this.initScroll();
      this.initTrail();
    });
  }

  ngOnDestroy() {
    this.greetTimers.forEach(clearTimeout);
    cancelAnimationFrame(this.frame);
    cancelAnimationFrame(this.trailFrame);
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
        if (on) this.detailsAt = performance.now();
        stage.classList.toggle('details-in', on);
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
      const prev = this.target;
      this.target = clamp01(track > 0 ? -rect.top / track : 0);
      // checkpoint: the photo has fully docked. Hold downward scrolling until the details have had time to finish writing in.
      const DOCKED = 0.88;
      if (this.target >= DOCKED && prev < DOCKED && this.gateArmed && !window.matchMedia('(max-height: 520px)').matches) {
        this.gateArmed = false;
        const SEQUENCE = 3300;                                           // the longest part of the details animation, in ms
        const done = (this.detailsAt || performance.now()) + SEQUENCE;
        this.gate.lock(Math.max(900, done - performance.now()));
      }
      if (this.target < DOCKED - 0.2) this.gateArmed = true;            // scrolled back up: arm it again
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

  goTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
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

    type Cloud = { x: number; y: number; size: number; sy: number; rot: number; rgb: [number, number, number]; age: number };
    type Pt = { x: number; y: number; t: number };
    const clouds: Cloud[] = [];
    const points: Pt[] = [];
    const DRAW_MS = 1100;   // time to sketch one cloud
    const LIFE_MS = 3600;   // total time before it has faded away
    const POINT_LIFE = 700;
    let w = 0, h = 0, dpr = 1;
    let lastSpawn = { x: -999, y: -999 };
    let lastSpawnAt = 0;

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

      // few clouds: far apart, at most three alive, and never two in quick succession
      const now = performance.now();
      if (Math.hypot(x - lastSpawn.x, y - lastSpawn.y) > 380 && clouds.length < 3 && now - lastSpawnAt > 1400) {
        lastSpawn = { x, y };
        lastSpawnAt = now;
        clouds.push({
          x, y,
          // wide range of sizes (small wisps up to big clouds), biased toward the small end, and each one squashed a little differently
          size: 70 + Math.pow(Math.random(), 1.7) * 280,
          sy: 0.75 + Math.random() * 0.5,
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
      const ky = k * c.sy;
      const [r, g, b] = dark ? c.rgb.map((v) => Math.min(255, v + 60)) : c.rgb;

      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.scale(k, ky);
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
