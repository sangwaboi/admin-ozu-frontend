export interface AdminAddress {
  id: string;
  user_id: string;
  address_name: string;
  location_lat: number;
  location_lng: number;
  location_address: string;
  location_house_address?: string | null;
  location_landmark?: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAddressInput {
  address_name: string;
  location_lat: number;
  location_lng: number;
  location_address: string;
  location_house_address?: string;
  location_landmark?: string;
  is_default?: boolean;
}

export interface UpdateAddressInput {
  id: string;
  address_name?: string;
  location_lat?: number;
  location_lng?: number;
  location_address?: string;
  location_house_address?: string;
  location_landmark?: string;
  is_default?: boolean;
}




