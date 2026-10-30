import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, Mail } from 'lucide-react';

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

interface ContactOTPVerificationProps {
  email: string;
  businessId: number;
  onVerified: () => void;
  onSendOTP: (email: string, businessId: number) => Promise<ContactOTPResult>;
  onVerifyOTP: (email: string, otp: string, businessId: number) => Promise<ContactOTPResult>;
}

const ContactOTPVerification: React.FC<ContactOTPVerificationProps> = ({
  email,
  businessId,
  onVerified,
  onSendOTP,
  onVerifyOTP,
}) => {
  const [step, setStep] = useState<'send' | 'verify' | 'loading' | 'done' | 'error'>('send');
  const [otp, setOtp] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [resending, setResending] = useState(false);

  const handleSend = async () => {
    setStep('loading');
    setErrorMsg('');
    const { ok, errorCode } = await onSendOTP(email, businessId);
    if (ok) {
      setStep('verify');
    } else {
      setErrorMsg(errorMessage(errorCode));
      setStep('error');
    }
  };

  const handleVerify = async () => {
    if (otp.length < 6) return;
    setStep('loading');
    setErrorMsg('');
    const { ok, errorCode } = await onVerifyOTP(email, otp, businessId);
    if (ok) {
      setStep('done');
      onVerified();
    } else {
      setErrorMsg(errorMessage(errorCode));
      setOtp('');
      setStep('verify');
    }
  };

  const handleResend = async () => {
    setResending(true);
    setErrorMsg('');
    setOtp('');
    const { ok, errorCode } = await onSendOTP(email, businessId);
    setResending(false);
    if (!ok) setErrorMsg(errorMessage(errorCode));
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
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
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
          <Button size="sm" onClick={handleVerify} disabled={otp.length < 6} className="w-full">
            Confirm Code
          </Button>
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
