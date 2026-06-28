import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private url = `${environment.apiUrl}/reports`;
  constructor(private http: HttpClient) {}

  downloadProducts(format: 'csv' | 'xlsx', filters: any = {}): Observable<Blob> {
    const params = new HttpParams({ fromObject: { format, ...filters } });
    return this.http.get(`${this.url}/products`, { responseType: 'blob', params });
  }

  saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
}
