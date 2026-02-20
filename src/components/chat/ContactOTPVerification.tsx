import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, Mail } from 'lucide-react';

interface ContactOTPVerificationProps {
  email: string;
  businessId: number;
  onVerified: () => void;
  onSendOTP: (email: string) => Promise<boolean>;
  onVerifyOTP: (email: string, otp: string, businessId: number) => Promise<boolean>;
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
    const ok = await onSendOTP(email);
    if (ok) {
      setStep('verify');
    } else {
      setErrorMsg('Failed to send OTP. Please try again.');
      setStep('error');
    }
  };

  const handleVerify = async () => {
    if (otp.length < 6) return;
    setStep('loading');
    setErrorMsg('');
    const ok = await onVerifyOTP(email, otp, businessId);
    if (ok) {
      setStep('done');
      onVerified();
    } else {
      setErrorMsg('Incorrect code. Please try again.');
      setOtp('');
      setStep('verify');
    }
  };

  const handleResend = async () => {
    setResending(true);
    setErrorMsg('');
    setOtp('');
    const ok = await onSendOTP(email);
    setResending(false);
    if (!ok) setErrorMsg('Failed to resend. Please try again.');
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
