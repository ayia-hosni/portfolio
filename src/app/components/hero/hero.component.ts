import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss',
})
export class HeroComponent implements OnInit {
  loaded = signal(false);
  hovering = signal(false);

  ngOnInit() {
    setTimeout(() => this.loaded.set(true), 80);
  }

  scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
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
