import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { ReportService } from '../../../core/services/report.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
})
export class ProductListComponent implements OnInit, OnDestroy {
  products: any[] = [];
  categories: any[] = [];
  pagination = { total: 0, page: 1, limit: 10, pages: 0 };
  loading = false;
  query: any = { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' };
  searchControl = new FormControl('');
  categoryFilter = '';
  bulkJobId: string | null = null;
  bulkProgress: any = null;
  private destroy$ = new Subject<void>();
  displayedColumns = ['name', 'category', 'price', 'status', 'actions'];

  constructor(
    private productSvc: ProductService,
    private categorySvc: CategoryService,
    private reportSvc: ReportService,
    private snack: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadCategories();
    this.loadProducts();
    this.searchControl.valueChanges.pipe(
      debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$)
    ).subscribe(val => { this.query = { ...this.query, search: val || '', page: 1 }; this.loadProducts(); });
  }

  loadProducts() {
    this.loading = true;
    const q = { ...this.query };
    if (this.categoryFilter) q['category_id'] = this.categoryFilter;
    this.productSvc.getAll(q).subscribe({
      next: (res) => { this.products = res.data; this.pagination = res.pagination; this.loading = false; },
      error: () => this.loading = false
    });
  }

  loadCategories() {
    this.categorySvc.getAll({ limit: 100 }).subscribe(res => this.categories = res.data);
  }

  onSortChange(col: string) {
    if (this.query.sortBy === col) { this.query.sortOrder = this.query.sortOrder === 'asc' ? 'desc' : 'asc'; }
    else { this.query.sortBy = col; this.query.sortOrder = 'asc'; }
    this.query.page = 1; this.loadProducts();
  }

  onPageChange(page: number) { this.query.page = page; this.loadProducts(); }
  onCategoryChange() { this.query.page = 1; this.loadProducts(); }

  deleteProduct(id: number) {
    if (!confirm('Delete this product?')) return;
    this.productSvc.delete(id).subscribe({
      next: () => { this.snack.open('Product deleted', 'OK', { duration: 3000 }); this.loadProducts(); },
      error: (e: any) => this.snack.open(e.error?.message || 'Error', 'OK', { duration: 3000 })
    });
  }

  onBulkFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.productSvc.bulkUpload(file).subscribe({
      next: (res) => { this.bulkJobId = res.jobId; this.snack.open('Upload started!', '', { duration: 3000 }); this.pollBulkStatus(); },
      error: (e: any) => this.snack.open(e.error?.message || 'Upload failed', 'OK', { duration: 4000 })
    });
  }

  pollBulkStatus() {
    if (!this.bulkJobId) return;
    interval(2000).pipe(takeUntil(this.destroy$), switchMap(() => this.productSvc.getBulkStatus(this.bulkJobId!)))
      .subscribe(res => {
        this.bulkProgress = res.data;
        if (res.data.status === 'completed') {
          this.snack.open(`Done! ${res.data.processed} rows processed.`, 'OK', { duration: 5000 });
          this.loadProducts(); this.bulkJobId = null; this.bulkProgress = null;
        } else if (res.data.status === 'failed') {
          this.snack.open(`Failed: ${res.data.errorMessage}`, 'OK', { duration: 5000 }); this.bulkJobId = null;
        }
      });
  }

  downloadTemplate() { this.productSvc.getBulkTemplate().subscribe(blob => this.reportSvc.saveBlob(blob, 'template.xlsx')); }

  downloadReport(format: 'csv' | 'xlsx') {
    const filters: any = {};
    if (this.categoryFilter) filters['category_id'] = this.categoryFilter;
    if (this.searchControl.value) filters['search'] = this.searchControl.value;
    this.reportSvc.downloadProducts(format, filters).subscribe(blob => this.reportSvc.saveBlob(blob, `products.${format}`));
  }

  min(a: number, b: number): number { return Math.min(a, b); }
  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
}
