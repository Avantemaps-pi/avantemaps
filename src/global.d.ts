// src/global.d.ts
interface Window {
  Pi?: any;
  handleBusinessSelection?: (business: {
    id: number;
    business_name: string;
    verification_status?: string | null;
    is_verified?: boolean;
  }) => void;
  sendVerificationRequest?: () => void;
}
