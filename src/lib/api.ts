import type { OrderRecord, PhotoSpot } from '../types';

function getClientId(): string {
  const KEY = 'meridian_client_id';
  let existing = localStorage.getItem(KEY);
  if (!existing) {
    existing = `traveller-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(KEY, existing);
  }
  return existing;
}

function baseHeaders(): Record<string, string> {
  return {
    'x-client-id': getClientId(),
  };
}

export async function fetchAppConfig(): Promise<{ mapsApiKey: string }> {
  const viteKey = (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_GOOGLE_MAPS_API_KEY;
  if (viteKey) {
    return { mapsApiKey: viteKey };
  }
  const res = await fetch('/api/config');
  if (!res.ok) return { mapsApiKey: '' };
  return (await res.json()) as { mapsApiKey: string };
}

export async function fetchSpots(params?: {
  q?: string;
  region?: string;
  category?: string;
  nearLat?: number;
  nearLng?: number;
  radiusKm?: number;
}): Promise<PhotoSpot[]> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.region && params.region !== 'All') qs.set('region', params.region);
  if (params?.category && params.category !== 'All') qs.set('category', params.category);
  if (params?.nearLat !== undefined) qs.set('nearLat', String(params.nearLat));
  if (params?.nearLng !== undefined) qs.set('nearLng', String(params.nearLng));
  if (params?.radiusKm !== undefined) qs.set('radiusKm', String(params.radiusKm));

  const queryStr = qs.toString();
  const res = await fetch(`/api/spots${queryStr ? `?${queryStr}` : ''}`, {
    headers: baseHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load travel photography spots.');
  const data = (await res.json()) as { spots: PhotoSpot[] };
  return data.spots;
}

export async function uploadSpotGallery(formData: FormData): Promise<PhotoSpot> {
  const res = await fetch('/api/spots', {
    method: 'POST',
    headers: baseHeaders(),
    body: formData,
  });
  const data = (await res.json()) as { spot?: PhotoSpot; error?: string };
  if (!res.ok || !data.spot) {
    throw new Error(data.error || 'Failed to upload gallery.');
  }
  return data.spot;
}

export async function toggleLikeSpot(
  spotId: string
): Promise<{ id: string; likesCount: number; likedByMe: boolean }> {
  const res = await fetch(`/api/spots/${encodeURIComponent(spotId)}/like`, {
    method: 'POST',
    headers: baseHeaders(),
  });
  if (!res.ok) throw new Error('Unable to update like.');
  return (await res.json()) as { id: string; likesCount: number; likedByMe: boolean };
}

export async function toggleSaveSpot(
  spotId: string
): Promise<{ id: string; savesCount: number; savedByMe: boolean }> {
  const res = await fetch(`/api/spots/${encodeURIComponent(spotId)}/save`, {
    method: 'POST',
    headers: baseHeaders(),
  });
  if (!res.ok) throw new Error('Unable to save spot.');
  return (await res.json()) as { id: string; savesCount: number; savedByMe: boolean };
}

export async function recordShareSpot(
  spotId: string
): Promise<{ id: string; sharesCount: number }> {
  const res = await fetch(`/api/spots/${encodeURIComponent(spotId)}/share`, {
    method: 'POST',
    headers: baseHeaders(),
  });
  if (!res.ok) throw new Error('Unable to record share.');
  return (await res.json()) as { id: string; sharesCount: number };
}

export async function submitSpotReview(
  spotId: string,
  payload: {
    authorName: string;
    rating: number;
    conditionTag: string;
    comment: string;
    visitedDate: string;
  }
): Promise<PhotoSpot> {
  const res = await fetch(`/api/spots/${encodeURIComponent(spotId)}/reviews`, {
    method: 'POST',
    headers: {
      ...baseHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { spot?: PhotoSpot; error?: string };
  if (!res.ok || !data.spot) {
    throw new Error(data.error || 'Failed to submit review.');
  }
  return data.spot;
}

export async function submitCheckoutOrder(payload: {
  customerName: string;
  customerEmail: string;
  shippingAddress?: string;
  paymentMethod: 'upi' | 'card' | 'express' | 'bank';
  cardNumber?: string;
  upiId?: string;
  items: OrderRecord['items'];
}): Promise<OrderRecord> {
  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: {
      ...baseHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { order?: OrderRecord; error?: string };
  if (!res.ok || !data.order) {
    throw new Error(data.error || 'Payment authorization failed.');
  }
  return data.order;
}
