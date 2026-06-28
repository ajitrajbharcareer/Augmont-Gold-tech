import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private url = `${environment.apiUrl}/products`;
  constructor(private http: HttpClient) {}

  getAll(query: any = {}): Observable<any> {
    const params: any = {};
    Object.entries(query).forEach(([k, v]) => { if (v !== undefined && v !== '') params[k] = String(v); });
    return this.http.get<any>(this.url, { params: new HttpParams({ fromObject: params }) });
  }
  getOne(id: number): Observable<any> { return this.http.get<any>(`${this.url}/${id}`); }
  create(fd: FormData): Observable<any> { return this.http.post<any>(this.url, fd); }
  update(id: number, fd: FormData): Observable<any> { return this.http.put<any>(`${this.url}/${id}`, fd); }
  delete(id: number): Observable<any> { return this.http.delete<any>(`${this.url}/${id}`); }
  bulkUpload(file: File): Observable<any> {
    const fd = new FormData(); fd.append('file', file);
    return this.http.post<any>(`${this.url}/bulk-upload`, fd);
  }
  getBulkStatus(jobId: string): Observable<any> { return this.http.get<any>(`${this.url}/bulk-status/${jobId}`); }
  getBulkTemplate(): Observable<Blob> { return this.http.get(`${this.url}/bulk-template`, { responseType: 'blob' }); }
}
