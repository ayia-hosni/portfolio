import { Component } from '@angular/core';
import { NavbarComponent } from './components/navbar/navbar.component';
import { HeroComponent } from './components/hero/hero.component';
import { TickerComponent } from './components/ticker/ticker.component';
import { AboutComponent } from './components/about/about.component';
import { ProjectsComponent } from './components/projects/projects.component';
import { DomainComponent } from './components/domain/domain.component';
import { StackComponent } from './components/stack/stack.component';
import { ContactComponent } from './components/contact/contact.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    NavbarComponent,
    HeroComponent,
    TickerComponent,
    AboutComponent,
    ProjectsComponent,
    DomainComponent,
    StackComponent,
    ContactComponent,
  ],
  template: `
    <app-navbar />
    <main>
      <app-hero />
      <app-ticker />
      <app-about />
      <app-projects />
      <app-domain />
      <app-stack />
      <app-contact />
    </main>
  `,
  styles: [`main { display: flex; flex-direction: column; }`],
})
export class AppComponent {}
