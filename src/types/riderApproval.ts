export interface PendingRider {
  id: string | number;
  name: string;
  contact: string;
  wa_id: string;
  zone?: string;
  createdAt: string;
}

export interface ApprovedRider {
  id: string | number;
  name: string;
  contact: string;
  zone?: string;
  isAvailable: boolean;
  hasLocation: boolean;
  createdAt: string;
}

export interface RidersResponse {
  riders: PendingRider[] | ApprovedRider[];
}



