import { Component } from '@angular/core';
import { RevealDirective } from '../../directives/reveal.directive';

@Component({
  selector: 'app-domain',
  standalone: true,
  imports: [RevealDirective],
  templateUrl: './domain.component.html',
  styleUrl: './domain.component.scss',
})
export class DomainComponent {}
