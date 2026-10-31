// A contact email code that was sent but not entered yet. The Pi Browser can reload when the
// owner switches to their email app, so it's kept in localStorage and the code entry resumes.
export const PENDING_CONTACT_CODE_KEY = 'avante:pending-contact-code';
// Fired on window whenever it changes, so the banner can follow along
export const PENDING_CONTACT_CODE_EVENT = 'avante:pending-contact-code-change';
// Asks an open CommuniCon page to show the code entry
export const OPEN_PENDING_CONTACT_CODE_EVENT = 'avante:open-pending-contact-code';

// Codes last 15 minutes (contact-otp's OTP_TTL_MS); a resend restarts that
const CODE_LIFETIME_MS = 15 * 60 * 1000;

export interface PendingContactCode {
  businessId: number;
  email: string;
  businessName: string;
  sentAt: number;
}

const notify = () => window.dispatchEvent(new Event(PENDING_CONTACT_CODE_EVENT));

export function clearPendingContactCode() {
  try {
    localStorage.removeItem(PENDING_CONTACT_CODE_KEY);
  } catch {
    // Storage unavailable: nothing to clear
  }
  notify();
}

export function savePendingContactCode(pending: Omit<PendingContactCode, 'sentAt'>) {
  try {
    localStorage.setItem(PENDING_CONTACT_CODE_KEY, JSON.stringify({ ...pending, sentAt: Date.now() }));
  } catch {
    // Storage unavailable: the code still works, it just won't survive a reload
  }
  notify();
}

/** The pending code, or null if there's none or it has expired (an expired one is cleared) */
export function loadPendingContactCode(): PendingContactCode | null {
  let parsed: Partial<PendingContactCode> | null = null;
  try {
    const stored = localStorage.getItem(PENDING_CONTACT_CODE_KEY);
    parsed = stored ? (JSON.parse(stored) as Partial<PendingContactCode>) : null;
  } catch {
    parsed = null;
  }
  if (!parsed) return null;
  const { businessId, email, businessName, sentAt } = parsed;
  if (
    typeof businessId !== 'number' ||
    typeof email !== 'string' ||
    typeof sentAt !== 'number' ||
    Date.now() - sentAt >= CODE_LIFETIME_MS
  ) {
    clearPendingContactCode();
    return null;
  }
  return { businessId, email, businessName: typeof businessName === 'string' ? businessName : '', sentAt };
}
