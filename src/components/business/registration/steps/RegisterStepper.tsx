import React from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface RegisterStep {
  title: string;
  intro: string;
}

interface RegisterStepperProps {
  steps: RegisterStep[];
  current: number;
  onClose: () => void;
  onBack: () => void;
  /** Steps 1–3; on the last step the button submits the form */
  onContinue: () => void;
  /** Continue is busy (photos still processing); the label says why */
  busyLabel?: string | undefined;
  disabled?: boolean | undefined;
  titleRef: React.RefObject<HTMLHeadingElement | null>;
  bodyRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}

/**
 * Step-by-step shell for registration: Close and "Step n of 4" on top, a
 * segmented progress bar, a scrolling body with the step title, and a footer
 * with Back and Continue that sits below the body (so it never covers a field).
 */
const RegisterStepper: React.FC<RegisterStepperProps> = ({
  steps,
  current,
  onClose,
  onBack,
  onContinue,
  busyLabel,
  disabled,
  titleRef,
  bodyRef,
  children,
}) => {
  const step = steps[current]!;
  const next = steps[current + 1];
  const isLast = current === steps.length - 1;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-4 pt-2">
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="-ml-2 h-11 w-11"
            aria-label="Close registration"
            onClick={onClose}
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </Button>
          <p className="text-sm font-semibold text-muted-foreground">
            Step {current + 1} of {steps.length}
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Registration progress"
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={current + 1}
          aria-valuetext={`Step ${current + 1} of ${steps.length}: ${step.title}`}
          className="mt-2 flex gap-1"
        >
          {steps.map((s, i) => (
            <div
              key={s.title}
              className={cn('h-1 flex-1 rounded-full', i <= current ? 'bg-primary' : 'bg-muted')}
            />
          ))}
        </div>
      </div>

      <div ref={bodyRef} data-register-body className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-6">
        <h1
          ref={titleRef}
          id="page-title"
          tabIndex={-1}
          className="text-[28px] leading-[34px] font-bold text-foreground outline-hidden"
        >
          {step.title}
        </h1>
        <p className="mt-2 text-muted-foreground">{step.intro}</p>
        <div className="mt-6">{children}</div>
      </div>

      <div data-register-footer className="border-t bg-background px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {next && (
          <p className="mb-2 text-sm text-muted-foreground">Next: {next.title}</p>
        )}
        <div className="flex gap-3">
          {current > 0 && (
            <Button
              type="button"
              variant="ghost"
              className="h-12 px-5 text-base"
              onClick={onBack}
              disabled={disabled}
            >
              Back
            </Button>
          )}
          {/* Separate elements: Continue switches to the last step before the click's
              default action runs, and a reused button would then submit the form */}
          <Button
            key={isLast ? 'submit' : 'continue'}
            type={isLast ? 'submit' : 'button'}
            className="h-12 flex-1 text-base"
            onClick={isLast ? undefined : onContinue}
            disabled={disabled || !!busyLabel}
          >
            {busyLabel ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {busyLabel}
              </>
            ) : isLast ? (
              'Register business'
            ) : (
              'Continue'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RegisterStepper;
