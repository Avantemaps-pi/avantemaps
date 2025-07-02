
/// <reference types="vite/client" />

interface Window {
  sendVerificationRequest?: (type: 'verification' | 'certification') => void;
  handleBusinessSelection?: (business: { id: number; name: string }) => void;
}
