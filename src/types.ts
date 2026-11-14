export type SpotRegion = 'India' | 'Europe' | 'Asia' | 'South America' | 'North Africa' | 'North America' | 'Oceania';
export type SpotCategory = 'Alpine' | 'Coastal' | 'Architectural' | 'Woodland';

export interface ExifMetadata {
  camera: string;
  lens: string;
  focalLength: string;
  aperture: string;
  shutterSpeed: string;
  iso: string;
}

export interface GalleryPhoto {
  id: string;
  url: string;
  caption: string;
  aspectRatio: '16:9' | '4:3' | '3:4' | '1:1';
  exif?: ExifMetadata;
}

export interface SpotReview {
  id: string;
  authorName: string;
  rating: number;
  conditionTag: string;
  comment: string;
  visitedDate: string;
  createdAt: string;
}

export interface PrintOption {
  id: string;
  label: string;
  dimensions: string;
  paper: string;
  price: number;
}

export interface LicenseOption {
  id: 'editorial' | 'commercial';
  label: string;
  terms: string;
  price: number;
}

export interface PhotographerProfile {
  name: string;
  handle: string;
  homeBase: string;
  payoutAccount: string;
}

export interface PhotoSpot {
  id: string;
  title: string;
  locationName: string;
  country: string;
  region: SpotRegion;
  category: SpotCategory;
  lat: number;
  lng: number;
  elevationMeters: number;
  bestTimeToShoot: string;
  accessNotes: string;
  description: string;
  coverUrl: string;
  aspectRatio: '16:9' | '4:3' | '3:4' | '1:1';
  photos: GalleryPhoto[];
  exif: ExifMetadata;
  photographer: PhotographerProfile;
  likesCount: number;
  savesCount: number;
  sharesCount: number;
  likedByMe?: boolean;
  savedByMe?: boolean;
  reviews: SpotReview[];
  printOptions: PrintOption[];
  licenseOptions: LicenseOption[];
  createdAt: string;
}

export interface CartItem {
  id: string;
  spotId: string;
  spotTitle: string;
  photographerName: string;
  coverUrl: string;
  kind: 'print' | 'license';
  optionId: string;
  optionLabel: string;
  unitPrice: number;
  quantity: number;
}

export interface OrderRecord {
  orderId: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  shippingAddress?: string;
  paymentMethod: 'upi' | 'card' | 'express' | 'bank';
  last4?: string;
  items: CartItem[];
  subtotal: number;
  shippingFee: number;
  platformFee: number;
  photographerPayout: number;
  total: number;
  status: 'Confirmed' | 'Preparing Print' | 'License Issued';
  licenseKeys: { spotTitle: string; licenseLabel: string; certificateCode: string }[];
}
