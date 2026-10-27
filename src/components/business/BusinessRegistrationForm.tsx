import React from 'react';
import { useBusinessRegistration } from '@/hooks/useBusinessRegistration';
import FormContainer from './registration/components/FormContainer';
import { Loader2 } from "lucide-react";
import { useNavigate } from '@/lib/router-compat';
import { useAuth } from '@/context/auth';
import { toast } from 'sonner';
import { PiAuthButton } from './registration/PiAuthButton';
import { AddressVerificationDialog } from './registration/components/AddressVerificationDialog';
import { DuplicateWarningDialog } from './registration/components/DuplicateWarningDialog';
import RegisterStepper, { type RegisterStep } from './registration/steps/RegisterStepper';
import ReviewStep from './registration/steps/ReviewStep';
import BusinessNameField from './registration/components/BusinessNameField';
import BusinessTypeSelector from './registration/components/BusinessTypeSelector';
import BusinessDescriptionField from './registration/components/BusinessDescriptionField';
import OwnerUsernameField from './registration/components/OwnerUsernameField';
import AddressFormFields from './registration/components/AddressFormFields';
import ContactFields from './registration/components/ContactFields';
import HoursFields from './registration/components/HoursFields';
import BusinessImageUpload from './registration/components/BusinessImageUpload';
import WalletAddressField from './registration/components/WalletAddressField';
import type { SubmitErrorHandler } from 'react-hook-form';
import type { FormValues } from './registration/formSchema';

// Steps and the fields each one validates, in order (also used to find the
// earliest step with an error on invalid submit)
const STEPS: (RegisterStep & { fields: (keyof FormValues)[] })[] = [
  {
    title: 'About your business',
    intro: 'Four short steps. You can change everything later.',
    fields: ['businessName', 'businessTypes', 'businessDescription', 'firstName', 'lastName'],
  },
  {
    title: 'Where to find you',
    intro: 'Your address puts you on the map, and your contact details let customers reach you.',
    fields: ['country', 'streetAddress', 'apartment', 'city', 'state', 'zipCode', 'countryCode', 'phone', 'email', 'website'],
  },
  {
    title: 'Hours, photos and payment',
    intro: 'When you’re open, what your place looks like, and where Pi payments go.',
    fields: [
      'mondayOpen', 'mondayClose', 'mondayClosed',
      'tuesdayOpen', 'tuesdayClose', 'tuesdayClosed',
      'wednesdayOpen', 'wednesdayClose', 'wednesdayClosed',
      'thursdayOpen', 'thursdayClose', 'thursdayClosed',
      'fridayOpen', 'fridayClose', 'fridayClosed',
      'saturdayOpen', 'saturdayClose', 'saturdayClosed',
      'sundayOpen', 'sundayClose', 'sundayClosed',
      'piWalletAddress',
    ],
  },
  {
    title: 'Review',
    intro: 'Check your listing once more. You can still edit any step.',
    fields: [],
  },
];
const LAST_STEP = STEPS.length - 1;

interface BusinessRegistrationFormProps {
  onSuccess?: () => void;
  onFormChange?: (hasChanges: boolean) => void;
  /** Close button; goes through the page's unsaved-changes check */
  onClose?: () => void;
}


const BusinessRegistrationForm = ({ onSuccess, onFormChange, onClose }: BusinessRegistrationFormProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    form,
    imageUpload,
    onSubmit,
    isSubmitting,
    showAddressVerification,
    verifiedAddress,
    handleAddressConfirmed,
    setShowAddressVerification,
    showDuplicateWarning,
    similarBusinesses,
    handleDuplicateConfirmed,
    setShowDuplicateWarning,
  } = useBusinessRegistration(onSuccess);
  const [step, setStep] = React.useState(0);
  const country = form.watch('country');
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const bodyRef = React.useRef<HTMLDivElement>(null);
  // Field to focus once a step change has rendered (invalid submit); otherwise the title
  const pendingFocusRef = React.useRef<keyof FormValues | null>(null);
  const isFirstRender = React.useRef(true);

  React.useEffect(() => {
    const businessCount = user?.businessCount || 0;
    if (businessCount > 0 && user?.subscriptionTier === 'individual') {
      toast.error("Upgrade Required", {
        description: "Multiple business registrations require a Business subscription. Please upgrade to continue.",
        action: { label: "Upgrade Now", onClick: () => navigate('/pricing') }
      });
      navigate('/registered-business');
    }
  }, [user, navigate]);

  // Track form changes
  React.useEffect(() => {
    if (onFormChange) {
      onFormChange(form.formState.isDirty || imageUpload.hasImages);
    }
  }, [form.formState.isDirty, imageUpload.hasImages, onFormChange]);

  // On every step change: back to the top, focus on the step title (or the field to fix)
  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    bodyRef.current?.scrollTo({ top: 0 });
    const field = pendingFocusRef.current;
    pendingFocusRef.current = null;
    if (field) form.setFocus(field);
    else titleRef.current?.focus({ preventScroll: true });
  }, [step, form]);

  const handleContinue = React.useCallback(async () => {
    const valid = await form.trigger(STEPS[step]!.fields);
    if (valid) {
      setStep((s) => Math.min(s + 1, LAST_STEP));
      return;
    }
    // First invalid control on screen (not every field passes its ref to the form,
    // e.g. the country picker); a chip group focuses its first chip
    requestAnimationFrame(() => {
      const invalid = bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
      const target = invalid?.matches('[role="group"]') ? invalid.querySelector<HTMLElement>('button') : invalid;
      target?.focus();
      target?.scrollIntoView({ block: 'center' });
    });
  }, [form, step]);

  // Enter in a text field continues instead of submitting the whole form early
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' || e.defaultPrevented || step === LAST_STEP) return;
    if ((e.target as HTMLElement).tagName !== 'INPUT') return;
    e.preventDefault();
    void handleContinue();
  };

  // On invalid submit: jump to the earliest step containing an error and focus the field
  const handleInvalid: SubmitErrorHandler<FormValues> = React.useCallback((errors) => {
    for (const [index, { fields }] of STEPS.entries()) {
      const field = fields.find((f) => errors[f]);
      if (field) {
        toast.error('Please fix the highlighted field');
        if (index === step) {
          form.setFocus(field);
        } else {
          pendingFocusRef.current = field;
          setStep(index);
        }
        return;
      }
    }
    toast.error('Please fix the highlighted field');
  }, [form, step]);

  // ✅ Require Pi auth before showing the form
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-lg font-semibold mb-2">Sign in with Pi Network</h2>
        <p className="text-muted-foreground mb-6 text-center max-w-md">
          Please sign in with your Pi Network account before registering a business.
        </p>
        <PiAuthButton />
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <FormContainer
        form={form}
        onSubmit={onSubmit}
        onInvalid={handleInvalid}
        isSubmitting={isSubmitting}
        className="flex h-full w-full max-w-2xl mx-auto flex-col"
      >
        <RegisterStepper
          steps={STEPS}
          current={step}
          onClose={() => onClose?.()}
          onBack={() => setStep((s) => Math.max(s - 1, 0))}
          onContinue={() => void handleContinue()}
          busyLabel={step === 2 && imageUpload.isProcessing ? 'Processing photos…' : undefined}
          disabled={isSubmitting}
          titleRef={titleRef}
          bodyRef={bodyRef}
        >
          <div onKeyDown={handleKeyDown}>
            {step === 0 && (
              <div className="space-y-6">
                <BusinessNameField disabled={isSubmitting} />
                <BusinessTypeSelector variant="chips" disabled={isSubmitting} />
                <BusinessDescriptionField disabled={isSubmitting} />
                <OwnerUsernameField />
              </div>
            )}
            {step === 1 && (
              <div className="space-y-6">
                <AddressFormFields disabled={isSubmitting} />
                <h2 className="pt-2 text-lg font-semibold text-foreground">Contact details</h2>
                {/* Remount when the country changes, so the phone code follows it (as when contact was its own tab) */}
                <ContactFields key={country} disabled={isSubmitting} />
              </div>
            )}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-foreground">Opening hours</h2>
                {/* Lets the time inputs shrink to fit at 375px (the grid's cells default to min-width: auto) */}
                <div className="[&_.grid>*]:min-w-0">
                  <HoursFields disabled={isSubmitting} />
                </div>
                <BusinessImageUpload
                  images={imageUpload.images}
                  onAddImage={imageUpload.addImage}
                  onAddCroppedImage={imageUpload.addCroppedImage}
                  onRemoveImage={imageUpload.removeImage}
                  onRetryImage={imageUpload.retryImage}
                  maxImages={3}
                  disabled={isSubmitting}
                  isProcessing={imageUpload.isProcessing}
                />
                <WalletAddressField disabled={isSubmitting} />
              </div>
            )}
            {step === LAST_STEP && (
              <ReviewStep
                stepTitles={STEPS.map((s) => s.title)}
                onEdit={setStep}
                images={imageUpload.images}
                disabled={isSubmitting}
              />
            )}
          </div>
        </RegisterStepper>
      </FormContainer>

      {isSubmitting && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-lg flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-lg font-medium">Registering your business...</p>
          </div>
        </div>
      )}

      <AddressVerificationDialog
        open={showAddressVerification}
        address={verifiedAddress}
        onConfirm={handleAddressConfirmed}
        onCancel={() => setShowAddressVerification(false)}
      />

      <DuplicateWarningDialog
        open={showDuplicateWarning}
        similarBusinesses={similarBusinesses}
        onConfirm={handleDuplicateConfirmed}
        onCancel={() => setShowDuplicateWarning(false)}
      />
    </div>
  );
};

export default BusinessRegistrationForm;
