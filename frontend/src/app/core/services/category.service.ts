import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private url = `${environment.apiUrl}/categories`;
  constructor(private http: HttpClient) {}

  getAll(params: any = {}): Observable<any> {
    return this.http.get<any>(this.url, { params: new HttpParams({ fromObject: params }) });
  }
  getOne(id: number): Observable<any> { return this.http.get<any>(`${this.url}/${id}`); }
  create(data: any): Observable<any> { return this.http.post<any>(this.url, data); }
  update(id: number, data: any): Observable<any> { return this.http.put<any>(`${this.url}/${id}`, data); }
  delete(id: number): Observable<any> { return this.http.delete<any>(`${this.url}/${id}`); }
}
