import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoginComponent } from "./components/login/login";
import { CommonModule } from '@angular/common'; // <--- Required for [ngClass] and | date
import { FormsModule } from '@angular/forms';   // <--- Required for [(ngModel)]

@Component({
  selector: 'app-root',
  standalone: true, // This confirms it's a standalone component
  imports: [
    RouterOutlet,
    LoginComponent,
    CommonModule, // Add this to unlock pipes and structural directives
    FormsModule   // Add this to unlock two-way data binding
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Retroid');
}
