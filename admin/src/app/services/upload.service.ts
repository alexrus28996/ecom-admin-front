import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface UploadResult {
  url: string;
  filename?: string;
  mimetype?: string;
  size?: number;
  [key: string]: any;
}

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly base = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  upload(file: File): Observable<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UploadResult>(`${this.base}/uploads`, formData);
  }

  uploadWithProgress(file: File): Observable<{ progress: number; result?: UploadResult | null }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.base}/uploads`, formData, { observe: 'events', reportProgress: true }).pipe(
      filter((event: HttpEvent<any>) => event.type === HttpEventType.UploadProgress || event.type === HttpEventType.Response),
      map((event: HttpEvent<any>) => {
        if (event.type === HttpEventType.UploadProgress) {
          const progress = event.total ? Math.round((event.loaded / event.total) * 100) : 0;
          return { progress, result: null };
        }
        const response = event as HttpResponse<UploadResult>;
        return { progress: 100, result: response.body ?? null };
      })
    );
  }

  uploadToCloudinary(file: File): Observable<CloudinaryUploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<CloudinaryUploadResult>(`${this.base}/uploads/cloudinary`, formData);
  }

  deleteFromCloudinary(publicId: string): Observable<{ result: any }> {
    return this.http.post<{ result: any }>(`${this.base}/uploads/cloudinary/delete`, { publicId });
  }
}
