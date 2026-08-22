// src/global.d.ts
/// <reference types="vite/client" />

interface Window {
  Pi?: any;
  handleBusinessSelection?: ((business: {
    id: number;
    business_name: string;
    verification_status?: string | null;
    is_verified?: boolean;
  }) => void) | undefined;
  sendVerificationRequest?: ((type: 'verification' | 'certification') => void) | undefined;
}
