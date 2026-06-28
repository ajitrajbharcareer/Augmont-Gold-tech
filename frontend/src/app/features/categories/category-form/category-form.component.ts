import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CategoryService } from '../../../core/services/category.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-category-form',
  templateUrl: './category-form.component.html',
})
export class CategoryFormComponent implements OnInit {
  form!: FormGroup;
  isEdit = false;
  categoryId: number | null = null;
  saving = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private categorySvc: CategoryService,
    private snack: MatSnackBar
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      description: [''],
    });
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.categoryId = +id;
      this.categorySvc.getOne(this.categoryId).subscribe(res =>
        this.form.patchValue({ name: res.data.name, description: res.data.description })
      );
    }
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.saving = true;
    const req = this.isEdit
      ? this.categorySvc.update(this.categoryId!, this.form.value)
      : this.categorySvc.create(this.form.value);
    req.subscribe({
      next: () => {
        this.snack.open(`Category ${this.isEdit ? 'updated' : 'created'}!`, 'OK', { duration: 3000 });
        this.router.navigate(['/categories']);
      },
      error: (e: any) => { this.saving = false; this.snack.open(e.error?.message || 'Error', 'OK', { duration: 3000 }); }
    });
  }
}
