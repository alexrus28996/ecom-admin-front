import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Paginated } from './api.types';

export type AddressType = 'shipping' | 'billing';

export interface Address {
  _id: string;
  user?: string;
  type: AddressType;
  name?: string | null;
  company?: string | null;
  line1: string;
  line2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AddressInput {
  type: AddressType;
  name?: string | null;
  company?: string | null;
  line1: string;
  line2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
  isDefault?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AddressService {
  private readonly base = `${environment.apiBaseUrl}/addresses`;

  constructor(private readonly http: HttpClient) {}

  list(params: { type?: AddressType; page?: number; limit?: number } = {}): Observable<Paginated<Address>> {
    let httpParams = new HttpParams();
    if (params.type) httpParams = httpParams.set('type', params.type);
    if (params.page) httpParams = httpParams.set('page', String(params.page));
    if (params.limit) httpParams = httpParams.set('limit', String(params.limit));
    return this.http.get<Paginated<Address>>(this.base, { params: httpParams });
  }

  get(id: string): Observable<{ address: Address }> {
    return this.http.get<{ address: Address }>(`${this.base}/${id}`);
  }

  create(payload: AddressInput): Observable<{ address: Address }> {
    return this.http.post<{ address: Address }>(this.base, payload);
  }

  update(id: string, payload: Partial<AddressInput>): Observable<{ address: Address }> {
    return this.http.put<{ address: Address }>(`${this.base}/${id}`, payload);
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/${id}`);
  }

  setDefault(id: string): Observable<{ address: Address }> {
    return this.http.post<{ address: Address }>(`${this.base}/${id}/default`, {});
  }
}
