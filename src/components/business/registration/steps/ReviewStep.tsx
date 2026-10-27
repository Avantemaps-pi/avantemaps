import React from 'react';
import { useFormContext } from 'react-hook-form';
import { FormValues } from '../formSchema';
import ListingPreview from '../components/ListingPreview';
import { ImageUploadStatus } from '@/hooks/useImageUpload';

interface ReviewStepProps {
  stepTitles: string[];
  onEdit: (step: number) => void;
  images: ImageUploadStatus[];
  disabled?: boolean | undefined;
}

const ReviewStep: React.FC<ReviewStepProps> = ({ stepTitles, onEdit, images, disabled }) => {
  const values = useFormContext<FormValues>().getValues();
  const photos = images.length;
  const openDays = [
    values.mondayClosed, values.tuesdayClosed, values.wednesdayClosed, values.thursdayClosed,
    values.fridayClosed, values.saturdayClosed, values.sundayClosed,
  ].filter((closed) => !closed).length;

  const sections = [
    [values.businessName, values.businessTypes.join(', ')],
    [
      [values.streetAddress, values.apartment, values.city, values.state, values.zipCode, values.country].filter(Boolean).join(', '),
      [`${values.countryCode}${values.phone}`, values.email, values.website].filter(Boolean).join(' · '),
    ],
    [
      `Open ${openDays} day${openDays === 1 ? '' : 's'} a week`,
      `${photos} photo${photos === 1 ? '' : 's'}`,
      values.piWalletAddress ? 'Pi wallet added' : '',
    ],
  ];

  return (
    <div className="space-y-6">
      <ul className="divide-y rounded-lg border">
        {sections.map((lines, i) => (
          <li key={stepTitles[i]} className="flex items-start gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">{stepTitles[i]}</p>
              {lines.filter(Boolean).map((line) => (
                <p key={line} className="mt-0.5 break-words text-sm text-muted-foreground">{line}</p>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onEdit(i)}
              disabled={disabled}
              aria-label={`Edit ${stepTitles[i]}`}
              className="-my-2 -mr-2 inline-flex min-h-11 items-center rounded-md px-2 text-sm font-semibold text-primary hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              Edit
            </button>
          </li>
        ))}
      </ul>

      <ListingPreview images={images} />
    </div>
  );
};

export default ReviewStep;
