export interface BusinessInsertPayload {
  user_id: string;
  subscription: string;
  business_name: string;
  business_types: string[];
  business_description: string;
  contact_email: string;
  phone_number: string;
  website?: string | null;
  pi_wallet_address: string;

  address: {
    street: string;
    apartment?: string | null;
    city: string;
    state: string;
    zip_code: string;
    country: string;
    lat?: number | null;
    lng?: number | null;
  };

  hours: {
    monday: { open?: string; close?: string; closed?: boolean };
    tuesday: { open?: string; close?: string; closed?: boolean };
    wednesday: { open?: string; close?: string; closed?: boolean };
    thursday: { open?: string; close?: string; closed?: boolean };
    friday: { open?: string; close?: string; closed?: boolean };
    saturday: { open?: string; close?: string; closed?: boolean };
    sunday: { open?: string; close?: string; closed?: boolean };
  };

  owner: {
    first_name: string;
    last_name: string;
  };
}
