import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import type * as THREE from 'three';
import { ScrollGateService } from '../../core/scroll-gate.service';

const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * A 3D letter "A" that starts whole, splits in two as the user scrolls through
 * the pinned section, and reveals the statement once the halves have parted.
 * Three.js is loaded lazily and everything runs outside Angular's zone.
 */
@Component({
  selector: 'app-split-intro',
  standalone: true,
  templateUrl: './split-intro.component.html',
  styleUrl: './split-intro.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitIntroComponent implements AfterViewInit, OnDestroy {
  readonly text =
    'I team up with founders and engineering teams to design, build, and run backend systems that stay up — combining clean architecture, fast delivery, and dashboards that tell the truth.';
  // Clouds fade in and drift as the split progresses (--delay staggers when each appears)
  readonly clouds = [
    { top: 10, left: 6, w: 280, drift: 160, delay: 0.03, tint: 'rgba(150, 205, 255, 0.4)' },
    { top: 62, left: 4, w: 220, drift: -120, delay: 0.18, tint: 'rgba(190, 160, 255, 0.38)' },
    { top: 14, left: 68, w: 300, drift: -180, delay: 0.1, tint: 'rgba(190, 160, 255, 0.38)' },
    { top: 70, left: 72, w: 240, drift: 140, delay: 0.3, tint: 'rgba(150, 205, 255, 0.4)' },
  ];
  // Birds fly left to right across the screen as you scroll
  readonly birds = [
    { top: 18, size: 54, off: -14, speed: 125, bob: 2.2, flap: 0.45 },
    { top: 24, size: 39, off: -22, speed: 120, bob: 2.8, flap: 0.38 },
    { top: 14, size: 32, off: -30, speed: 118, bob: 3.1, flap: 0.5 },
    { top: 72, size: 46, off: -16, speed: 130, bob: 2.5, flap: 0.42 },
    { top: 80, size: 32, off: -26, speed: 122, bob: 3.3, flap: 0.36 },
    { top: 50, size: 28, off: -34, speed: 128, bob: 2.9, flap: 0.4 },
  ];
  readonly words = this.text.split(' ');

  @ViewChild('section', { static: true }) section!: ElementRef<HTMLElement>;
  @ViewChild('stage', { static: true }) stage!: ElementRef<HTMLElement>;
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;

  private frame = 0;
  private visible = false;
  private disposed = false;
  private cleanup: Array<() => void> = [];

  constructor(private zone: NgZone, private gate: ScrollGateService) {}

  ngAfterViewInit() {
    if (typeof window === 'undefined') return;
    this.zone.runOutsideAngular(() => this.init());
  }

  ngOnDestroy() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.cleanup.forEach((fn) => fn());
  }

  /** resolves once the window has fully loaded */
  private afterLoad(): Promise<void> {
    return document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise((res) => window.addEventListener('load', () => res(), { once: true }));
  }

  /** resolves when the browser is idle (or after `timeout` ms at the latest) */
  /** resolves once the section is close (the last ~40% of a screen before it appears), i.e. after the hero's pinned intro has played */
  private whenNear(): Promise<void> {
    return new Promise((res) => {
      const el = this.section.nativeElement;
      if (el.getBoundingClientRect().top < window.innerHeight * 1.2) return res();
      const io = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) { io.disconnect(); res(); } },
        { rootMargin: '0px 0px 40% 0px' }
      );
      io.observe(el);
      this.cleanup.push(() => io.disconnect());
    });
  }

  private idle(timeout: number): Promise<void> {
    return new Promise((res) => {
      // the section is about to be seen: no more politeness, just get ready
      if (this.section.nativeElement.getBoundingClientRect().top < window.innerHeight * 1.6) return res();
      const ric = (window as any).requestIdleCallback as undefined | ((cb: () => void, o: { timeout: number }) => void);
      ric ? ric(() => res(), { timeout }) : setTimeout(res, 200);
    });
  }

  private async init() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return; // CSS shows the statement statically

    // Heavy start-up work (download + parse three.js, create the WebGL context, compile shaders) must not land while the
    // visitor is on the hero: it waits for the page to finish loading, then for the section to be about a screen away,
    // and then runs in idle moments.
    await this.afterLoad();
    await this.whenNear();      // never while the visitor is still on the hero
    if (this.disposed) return;
    await this.idle(1500);
    if (this.disposed) return;

    const T = await import('three');
    await this.idle(1000);
    if (this.disposed) return;

    const canvas = this.canvas.nativeElement;
    const stage = this.stage.nativeElement;
    const section = this.section.nativeElement;
    const fx = stage.querySelector('.fx') as HTMLElement;

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.z = 10;

    let renderer: InstanceType<typeof T.WebGLRenderer>;
    try {
      renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      // No WebGL (old device, blocked GPU): skip the 3D letter, just show the statement
      stage.style.setProperty('--reveal', '1');
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    await this.idle(400);                       // context created: let the page breathe before building the scene
    if (this.disposed) return;
    // Pencil-sketch look: graphite hatching that gets denser in the shade, plus a re-traced outline
    const uniforms = {
      uPaper: { value: new T.Color() },
      uInk: { value: new T.Color() },
      uAppear: { value: 0 },
    };
    const material = new T.ShaderMaterial({
      uniforms,
      transparent: true,
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 uPaper;
        uniform vec3 uInk;
        uniform float uAppear;
        varying vec3 vNormal;

        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

        // thin pencil line of a given angle and spacing, in screen pixels
        float hatch(vec2 p, float angle, float gap) {
          float c = cos(angle), s = sin(angle);
          float d = abs(fract((p.x * c + p.y * s) / gap) - 0.5) * gap;
          return 1.0 - smoothstep(0.35, 0.95, d);
        }

        void main() {
          float light = dot(normalize(vNormal), normalize(vec3(-0.4, 0.7, 0.6))) * 0.5 + 0.5;
          float shade = 1.0 - light;                       // 0 = lit, 1 = dark
          vec2 p = gl_FragCoord.xy;

          float ink = 0.0;
          ink += hatch(p, 0.785, 7.0) * smoothstep(0.18, 0.40, shade);   // first pass
          ink += hatch(p, -0.70, 7.0) * smoothstep(0.45, 0.70, shade);   // cross hatch
          ink += hatch(p, 0.10, 6.0)  * smoothstep(0.70, 0.95, shade);   // darkest, nearly flat
          ink = clamp(ink, 0.0, 1.0);

          // graphite grain: broken strokes, uneven pressure
          float grain = hash(floor(p * 0.7));
          ink *= 0.55 + 0.45 * grain;
          ink *= step(0.12, hash(floor(p / 5.0) + 7.0) + 0.55);

          vec3 col = mix(uPaper, uInk, ink * 0.85);
          // faint overall paper tooth
          col -= (hash(p) - 0.5) * 0.025;
          gl_FragColor = vec4(col, uAppear);
        }`,
    });

    const lineMats: Array<{ mat: InstanceType<typeof T.LineBasicMaterial>; base: number }> = [];
    const applyTheme = () => {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      uniforms.uPaper.value.set(dark ? 0x1c1c22 : 0xeef3ff);   // pastel blue-white paper / dark paper
      uniforms.uInk.value.set(dark ? 0xe8e8ee : 0x3a3a46);     // chalk / graphite
      lineMats.forEach(({ mat }) => mat.color.set(dark ? 0xf2f2f2 : 0x2c2c36));
    };

    // Re-traced outline: 3 jittered copies of the edges, like going over a line several times
    const makeHalf = (geom: InstanceType<typeof T.ExtrudeGeometry>, seed: number) => {
      const mesh = new T.Mesh(geom, material);
      const edges = new T.EdgesGeometry(geom, 30);
      // jitter is a function of the vertex *position*, so a corner shared by two segments
      // moves as one point and the outline stays continuous
      const rand = (x: number, y: number, z: number, k: number) => {
        const n = Math.sin(Math.round(x * 100) * 12.9898 + Math.round(y * 100) * 78.233 + Math.round(z * 100) * 37.719 + k * 19.19 + seed * 5.5) * 43758.5453;
        return n - Math.floor(n);
      };
      [{ j: 0.0, o: 0.95 }, { j: 0.035, o: 0.5 }, { j: 0.06, o: 0.3 }].forEach(({ j, o }, k) => {
        const g = edges.clone();
        const pos = g.attributes['position'];
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
          pos.setXYZ(i, x + (rand(x, y, z, k) - 0.5) * j, y + (rand(x, y, z, k + 7) - 0.5) * j, z);
        }
        const mat = new T.LineBasicMaterial({ transparent: true, opacity: 0 });
        lineMats.push({ mat, base: o });
        mesh.add(new T.LineSegments(g, mat));
      });
      return mesh;
    };

    const leftGeom = this.halfGeometry(T, true);
    const rightGeom = this.halfGeometry(T, false);
    const left = makeHalf(leftGeom, 1);
    const right = makeHalf(rightGeom, 2);
    applyTheme();
    const themeObserver = new MutationObserver(applyTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    const group = new T.Group();
    group.add(left, right);
    scene.add(group);
    await this.idle(400);                       // scene built: separate the observers and shader compile from it
    if (this.disposed) return;

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = stage;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);

    // Only render while the section is on screen
    const io = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
    });
    io.observe(section);

    let target = 0;
    let progress = 0;
    let gateArmed = true;
    let enterTarget = 0;   // 0 → 1 while the section scrolls into view (A appears, still whole)
    let enter = 0;
    const onScroll = () => {
      const rect = section.getBoundingClientRect();
      const track = rect.height - window.innerHeight;
      const prevTarget = target;
      target = clamp01(track > 0 ? -rect.top / track : 0);
      // checkpoint: the statement has just finished writing itself. Hold downward scrolling long enough to read it.
      const WRITTEN = 0.72;
      if (target >= WRITTEN && prevTarget < WRITTEN && gateArmed) {
        gateArmed = false;
        this.gate.lock(2600);
      }
      if (target < WRITTEN - 0.2) gateArmed = true;
      enterTarget = clamp01(1 - rect.top / window.innerHeight);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    progress = target;
    enter = enterTarget;

    let last = performance.now();
    let elapsed = 0;
    const tick = () => {
      this.frame = requestAnimationFrame(tick);
      const now = performance.now();
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (!this.visible) return;
      elapsed += delta;
      const time = elapsed;

      // Chase the scroll target quickly (frame-rate independent): a short lag keeps it fluid without feeling sluggish
      progress += (target - progress) * (1 - Math.exp(-delta * 12));
      enter += (enterTarget - enter) * (1 - Math.exp(-delta * 9));
      const appear = 1 - Math.pow(1 - enter, 3);   // easeOutCubic: the whole A pops into view first
      uniforms.uAppear.value = appear;
      lineMats.forEach(({ mat, base }) => (mat.opacity = base * appear));
      // the whole split now plays out in the first ~70% of the pinned scroll, with a gentler ease than cubic
      const fast = clamp01(progress / 0.7);
      const eased = easeInOutQuad(fast);

      stage.style.setProperty('--reveal', String(clamp01((eased - 0.3) / 0.6)));
      // handwritten "scroll" cue: visible once the whole A has appeared, gone as soon as it starts to split
      stage.style.setProperty('--hint', String(clamp01((appear - 0.6) / 0.4) * clamp01(1 - fast * 10)));

      // effects follow the scroll directly (not the eased split), so they keep appearing as you scroll down
      fx.style.setProperty('--split', fast.toFixed(4));

      // fully split, the halves sit either side of the sentence card
      const split = eased * Math.min(7.4, 0.4 * 11.55 * camera.aspect);
      left.position.x = -split;
      right.position.x = split;

      group.rotation.y = Math.sin(time * 0.6) * 0.3 + eased * 0.25; // gentle sway: the A stays readable
      group.rotation.x = Math.sin(time * 0.3) * 0.15;
      group.position.y = Math.sin(time * 0.5) * 0.2 - eased * 0.3;
      group.scale.setScalar(Math.max(0.0001, (0.55 + 0.45 * appear) * (1 - eased * 0.15)));

      renderer.render(scene, camera);
    };
    await this.idle(1000);
    if (this.disposed) return;
    // KHR_parallel_shader_compile: the GPU driver compiles the shaders in the background instead of freezing the first frame
    try { await (renderer as any).compileAsync(scene, camera); } catch { /* older GPUs compile on the first draw instead */ }
    if (this.disposed) return;
    tick();

    this.cleanup.push(() => {
      window.removeEventListener('scroll', onScroll);
      io.disconnect();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      leftGeom.dispose();
      rightGeom.dispose();
      material.dispose();
      lineMats.forEach(({ mat }) => mat.dispose());
      renderer.dispose();
    });
  }

  /**
   * Left or right half of an extruded letter A, cut along x = 0.
   * Both halves share the same coordinates (no per-half centering), so at rest they
   * fit together into one A: flat apex, two slanted legs, a crossbar and a triangular counter.
   */
  private halfGeometry(T: typeof THREE, isLeft: boolean) {
    // outline of the left half; the right half is its mirror image
    const pts: Array<[number, number]> = [
      [0, 2.5],          // top, on the cut
      [-0.45, 2.5],      // top-left of the apex
      [-1.6, -2.5],      // outer foot
      [-0.98, -2.5],     // inner foot
      [-0.658, -1.1],    // inner leg, under the crossbar
      [0, -1.1],         // bottom of the crossbar, on the cut
      [0, -0.55],        // top of the crossbar, on the cut
      [-0.5315, -0.55],  // counter (hole) bottom corner
      [0, 1.761],        // counter apex, on the cut
    ];
    const shape = new T.Shape();
    pts.forEach(([x, y], i) => {
      const X = isLeft ? x : -x;
      i === 0 ? shape.moveTo(X, y) : shape.lineTo(X, y);
    });
    shape.closePath();

    const geom = new T.ExtrudeGeometry(shape, {
      steps: 1,
      depth: 0.7,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.05,     // slightly overlaps at the cut so the seam is invisible
      bevelSegments: 4,
    });
    geom.translate(0, 0, -0.35); // center depth only, keep x/y so the halves line up
    return geom;
  }
}
