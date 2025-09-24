import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import {
  Review,
  ReviewFilters,
  Paginated,
  ApiResponse
} from './api.types';

export interface CreateReviewRequest {
  rating: number;
  comment?: string;
  media?: {
    type: 'image' | 'video';
    url: string;
    alt?: string;
  }[];
}

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private readonly baseUrl = `${environment.apiBaseUrl}`;

  constructor(private readonly http: HttpClient) {}

  // Public/User endpoints
  getProductReviews(productId: string, filters: Partial<ReviewFilters> = {}): Observable<Paginated<Review>> {
    let params = new HttpParams();

    if (filters.status) params = params.set('status', filters.status);
    if (filters.rating) params = params.set('rating', filters.rating.toString());
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.sort) params = params.set('sort', filters.sort);
    if (filters.order) params = params.set('order', filters.order);

    return this.http.get<Paginated<Review>>(`${this.baseUrl}/products/${productId}/reviews`, { params });
  }

  createReview(productId: string, reviewData: CreateReviewRequest): Observable<Review> {
    return this.http.post<ApiResponse<Review>>(`${this.baseUrl}/products/${productId}/reviews`, reviewData)
      .pipe(map(response => response.data!));
  }

  deleteUserReview(productId: string, reviewId: string): Observable<{ success: boolean }> {
    return this.http.delete<ApiResponse<{ success: boolean }>>(`${this.baseUrl}/products/${productId}/reviews/${reviewId}`)
      .pipe(map(response => response.data!));
  }

  // Admin endpoints for moderation
  getAllReviews(filters: ReviewFilters = {}): Observable<Paginated<Review>> {
    let params = new HttpParams();

    if (filters.product) params = params.set('product', filters.product);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.rating) params = params.set('rating', filters.rating.toString());
    if (filters.dateStart) params = params.set('dateStart', filters.dateStart);
    if (filters.dateEnd) params = params.set('dateEnd', filters.dateEnd);
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.sort) params = params.set('sort', filters.sort);
    if (filters.order) params = params.set('order', filters.order);

    return this.http.get<Paginated<Review>>(`${this.baseUrl}/admin/reviews`, { params });
  }

  approveReview(reviewId: string): Observable<Review> {
    return this.http.patch<ApiResponse<Review>>(`${this.baseUrl}/admin/reviews/${reviewId}`, { status: 'approved' })
      .pipe(map(response => response.data!));
  }

  rejectReview(reviewId: string): Observable<Review> {
    return this.http.patch<ApiResponse<Review>>(`${this.baseUrl}/admin/reviews/${reviewId}`, { status: 'rejected' })
      .pipe(map(response => response.data!));
  }

  deleteReview(reviewId: string): Observable<{ success: boolean }> {
    return this.http.delete<ApiResponse<{ success: boolean }>>(`${this.baseUrl}/admin/reviews/${reviewId}`)
      .pipe(map(response => response.data!));
  }

  // For backward compatibility
  list(filters: any = {}): Observable<Paginated<Review>> {
    const reviewFilters: ReviewFilters = {
      product: filters.product,
      status: filters.status,
      rating: filters.rating,
      dateStart: filters.dateStart || filters.from,
      dateEnd: filters.dateEnd || filters.to,
      page: filters.page,
      limit: filters.limit,
      sort: filters.sort
    };

    return this.getAllReviews(reviewFilters);
  }

  approve(id: string): Observable<{ success: boolean }> {
    return this.approveReview(id).pipe(
      map(() => ({ success: true }))
    );
  }

  reject(id: string): Observable<{ success: boolean }> {
    return this.rejectReview(id).pipe(
      map(() => ({ success: true }))
    );
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.deleteReview(id);
  }
}