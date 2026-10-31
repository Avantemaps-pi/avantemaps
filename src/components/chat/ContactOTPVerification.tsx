import React, { useState } from 'react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { ClipboardPaste, Loader2, Mail } from 'lucide-react';
import { clearPendingContactCode, loadPendingContactCode, savePendingContactCode } from './pendingContactCode';

/** The contact-otp function's answer: ok, or the error_code it gave (null if none) */
export interface ContactOTPResult {
  ok: boolean;
  errorCode: string | null;
}

// What to tell the owner for each contact-otp error_code
const ERROR_MESSAGES: Record<string, string> = {
  cooldown: 'Please wait a minute before requesting another code.',
  email_failed: "We couldn't send the email right now. Please try again later.",
  not_contact_email: "This isn't the business's contact email.",
  too_many_attempts: 'Too many attempts. Request a new code.',
  expired: 'That code has expired. Request a new one.',
  invalid: 'Incorrect code. Please try again.',
};
const errorMessage = (code: string | null) => (code && ERROR_MESSAGES[code]) || 'Something went wrong. Please try again.';
// The code can't be used any more (or never could): stop offering to resume it
const TERMINAL_ERRORS = ['expired', 'too_many_attempts', 'not_contact_email'];
const digitsOnly = (text: string) => text.replace(/\D/g, '').slice(0, 6);

// A code was already sent for this email and business and hasn't expired
const hasPendingCode = (email: string, businessId: number) => {
  const pending = loadPendingContactCode();
  return !!pending && pending.businessId === businessId && pending.email.toLowerCase() === email.toLowerCase();
};

interface ContactOTPVerificationProps {
  email: string;
  businessId: number;
  /** Shown in the reminder banner while a code is pending */
  businessName?: string | undefined;
  onVerified: () => void;
  onSendOTP: (email: string, businessId: number) => Promise<ContactOTPResult>;
  onVerifyOTP: (email: string, otp: string, businessId: number) => Promise<ContactOTPResult>;
}

const ContactOTPVerification: React.FC<ContactOTPVerificationProps> = ({
  email,
  businessId,
  businessName,
  onVerified,
  onSendOTP,
  onVerifyOTP,
}) => {
  // With a code already on its way (e.g. after a reload), go straight to entering it
  const [step, setStep] = useState<'send' | 'verify' | 'loading' | 'done' | 'error'>(() =>
    hasPendingCode(email, businessId) ? 'verify' : 'send'
  );
  const [otp, setOtp] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [resending, setResending] = useState(false);

  const rememberCode = () => savePendingContactCode({ businessId, email, businessName: businessName ?? '' });

  const handleSend = async () => {
    setStep('loading');
    setErrorMsg('');
    const { ok, errorCode } = await onSendOTP(email, businessId);
    if (ok) {
      rememberCode();
      setStep('verify');
    } else {
      if (errorCode && TERMINAL_ERRORS.includes(errorCode)) clearPendingContactCode();
      setErrorMsg(errorMessage(errorCode));
      setStep('error');
    }
  };

  const handleVerify = async (code: string) => {
    if (code.length < 6 || step === 'loading') return;
    setStep('loading');
    setErrorMsg('');
    const { ok, errorCode } = await onVerifyOTP(email, code, businessId);
    if (ok) {
      clearPendingContactCode();
      setStep('done');
      onVerified();
    } else {
      if (errorCode && TERMINAL_ERRORS.includes(errorCode)) clearPendingContactCode();
      setErrorMsg(errorMessage(errorCode));
      setOtp('');
      setStep('verify');
    }
  };

  // The server sends the same code again while it still works, and restarts its 15 minutes
  const handleResend = async () => {
    setResending(true);
    setErrorMsg('');
    setOtp('');
    const { ok, errorCode } = await onSendOTP(email, businessId);
    setResending(false);
    if (ok) {
      rememberCode();
    } else {
      if (errorCode && TERMINAL_ERRORS.includes(errorCode)) clearPendingContactCode();
      setErrorMsg(errorMessage(errorCode));
    }
  };

  const handlePaste = async () => {
    let text = '';
    try {
      text = await navigator.clipboard.readText();
    } catch {
      setErrorMsg("Couldn't read the clipboard. Long-press the boxes and paste instead.");
      return;
    }
    const code = digitsOnly(text);
    if (code.length < 6) {
      setErrorMsg('No 6-digit code on the clipboard.');
      return;
    }
    setOtp(code);
    void handleVerify(code);
  };

  if (step === 'done') {
    return (
      <div className="bg-card border rounded-lg p-4 mt-2 text-sm text-primary font-medium">
        ✓ Contact information verified successfully!
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-lg p-4 mt-2 space-y-3">
      <div className="flex items-center gap-2">
        <Mail size={18} className="text-primary flex-shrink-0" />
        <p className="text-sm font-medium">Verify Contact Information</p>
      </div>

      {step === 'send' && (
        <>
          <p className="text-xs text-muted-foreground">
            We'll send a 6-digit code to <span className="font-medium text-foreground">{email}</span> to confirm your contact information.
          </p>
          <Button size="sm" onClick={handleSend} className="w-full">
            Send Verification Code
          </Button>
        </>
      )}

      {step === 'loading' && (
        <div className="flex items-center justify-center gap-2 py-2">
          <Loader2 size={18} className="animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Please wait…</span>
        </div>
      )}

      {step === 'verify' && (
        <>
          <p className="text-xs text-muted-foreground">
            Enter the 6-digit code sent to <span className="font-medium text-foreground">{email}</span>
          </p>
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={setOtp}
              onComplete={(code: string) => void handleVerify(code)}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern={REGEXP_ONLY_DIGITS}
              pasteTransformer={digitsOnly}
              aria-label="Verification code"
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          {errorMsg && <p className="text-xs text-destructive text-center">{errorMsg}</p>}
          <p className="text-xs text-muted-foreground text-center">
            Tip: the code is in the email's subject. Copy it from your inbox, then tap Paste.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handlePaste} className="flex-1">
              <ClipboardPaste className="h-4 w-4" aria-hidden="true" />
              Paste
            </Button>
            <Button size="sm" onClick={() => handleVerify(otp)} disabled={otp.length < 6} className="flex-1">
              Confirm Code
            </Button>
          </div>
          <button
            onClick={handleResend}
            disabled={resending}
            className="text-xs text-primary underline underline-offset-2 w-full text-center disabled:opacity-50"
          >
            {resending ? 'Resending…' : "Didn't receive it? Resend"}
          </button>
        </>
      )}

      {step === 'error' && (
        <>
          <p className="text-xs text-destructive">{errorMsg}</p>
          <Button size="sm" variant="outline" onClick={() => setStep('send')} className="w-full">
            Try Again
          </Button>
        </>
      )}
    </div>
  );
};

export default ContactOTPVerification;
