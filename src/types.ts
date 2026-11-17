export type MenuCategory =
  | 'Mentai Series'
  | 'Goreng & Crispy'
  | 'Special & Kuah'
  | 'Paket & Cake'
  | 'Add-On';

export interface MenuVariant {
  label: string;
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  description: string;
  imageUrl: string;
  variants: MenuVariant[];
  popular: boolean;
  available: boolean;
  sortOrder: number;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  whatsappNumber: string;
  instagramHandle: string;
  instagramUrl: string;
  tiktokHandle: string;
  tiktokUrl: string;
  mapsUrl: string;
  addressNote: string;
  openHours: string;
  announcement: string;
  gofoodUrl: string;
  shopeefoodUrl: string;
  grabfoodUrl: string;
}

export interface CartItem {
  key: string;
  menuItemId: string;
  name: string;
  variantLabel: string;
  price: number;
  imageUrl: string;
  quantity: number;
}

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'owner' | 'staff';
}

export interface StaffAccount {
  id: string;
  username: string;
  displayName: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaffSession {
  role: 'owner' | 'staff';
  uid: string;
  username: string;
  displayName: string;
}

