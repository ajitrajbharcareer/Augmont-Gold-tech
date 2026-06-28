import { Component, OnInit } from '@angular/core';
import { CategoryService } from '../../../core/services/category.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-category-list',
  templateUrl: './category-list.component.html',
})
export class CategoryListComponent implements OnInit {
  categories: any[] = [];
  loading = false;
  displayedColumns = ['name', 'description', 'status', 'actions'];

  constructor(private categorySvc: CategoryService, private snack: MatSnackBar) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.categorySvc.getAll({ limit: 100 }).subscribe({
      next: (res) => { this.categories = res.data; this.loading = false; },
      error: () => this.loading = false
    });
  }

  delete(id: number) {
    if (!confirm('Delete this category?')) return;
    this.categorySvc.delete(id).subscribe({
      next: () => { this.snack.open('Deleted!', 'OK', { duration: 3000 }); this.load(); },
      error: (e: any) => this.snack.open(e.error?.message || 'Error', 'OK', { duration: 3000 })
    });
  }
}
