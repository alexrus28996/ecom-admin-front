import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface UploadResult { url: string; [key: string]: any }

@Injectable({ providedIn: 'root' })
export class UploadService {
  private base = `${environment.apiBaseUrl}`;
  constructor(private http: HttpClient) {}

  upload(file: File): Observable<UploadResult> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<UploadResult>(`${this.base}/uploads`, form, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      map((event: any) => {
        if (event?.type === HttpEventType.Response) {
          return event.body as UploadResult;
        }
        return null as any;
      }),
      map((res) => res)
    );
  }
}
