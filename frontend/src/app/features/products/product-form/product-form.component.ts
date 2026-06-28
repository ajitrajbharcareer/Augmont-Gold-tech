import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-product-form',
  templateUrl: './product-form.component.html',
})
export class ProductFormComponent implements OnInit {
  form!: FormGroup;
  categories: any[] = [];
  isEdit = false;
  productId: number | null = null;
  imageFile: File | null = null;
  imagePreview: string | null = null;
  saving = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private productSvc: ProductService,
    private categorySvc: CategoryService,
    private snack: MatSnackBar
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      price: [null, [Validators.required, Validators.min(0)]],
      category_id: [null, Validators.required],
    });
    this.categorySvc.getAll({ limit: 100 }).subscribe(res => this.categories = res.data);
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true; this.productId = +id;
      this.productSvc.getOne(this.productId).subscribe(res => {
        const p = res.data;
        this.form.patchValue({ name: p.name, price: p.price, category_id: p.category_id });
        if (p.image) this.imagePreview = `http://localhost:3000/${p.image}`;
      });
    }
  }

  onImageChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.imageFile = file;
    const reader = new FileReader();
    reader.onload = () => this.imagePreview = reader.result as string;
    reader.readAsDataURL(file);
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.saving = true;
    const fd = new FormData();
    fd.append('name', this.form.value.name);
    fd.append('price', this.form.value.price);
    fd.append('category_id', this.form.value.category_id);
    if (this.imageFile) fd.append('image', this.imageFile);
    const req = this.isEdit ? this.productSvc.update(this.productId!, fd) : this.productSvc.create(fd);
    req.subscribe({
      next: () => { this.snack.open(`Product ${this.isEdit ? 'updated' : 'created'}!`, 'OK', { duration: 3000 }); this.router.navigate(['/products']); },
      error: (e: any) => { this.saving = false; this.snack.open(e.error?.message || 'Error', 'OK', { duration: 4000 }); }
    });
  }
}
