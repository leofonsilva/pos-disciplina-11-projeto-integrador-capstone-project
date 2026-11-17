import { Injectable } from '@angular/core';
import { healthResponseSchema, type HealthResponse } from '@hero/contracts';

@Injectable({ providedIn: 'root' })
export class HealthService {
  async fetchHealth(): Promise<HealthResponse> {
    const response = await fetch('/api/health');
    if (!response.ok) {
      throw new Error(`GET /api/health falhou com status ${response.status}`);
    }
    return healthResponseSchema.parse(await response.json());
  }
}
