import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formSchema, FormValues } from '@/components/business/registration/formSchema';
import { Business } from '@/types/business';

// Helper to extract country code from phone number
const extractCountryCode = (phone?: string): string => {
  if (!phone) return '+1';
  const match = phone.match(/^(\+\d{1,3})/);
  return match ? match[1] : '+1';
};

// Helper to extract phone number without country code
const extractPhoneNumber = (phone?: string): string => {
  if (!phone) return '';
  return phone.replace(/^\+\d{1,3}\s*/, '');
};

export const useBusinessFormInit = (business: Business) => {
  const contactInfo = business.contactInfo || {};
  const hours = business.hours || {};

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: contactInfo.first_name || '',
      lastName: contactInfo.last_name || '',
      businessName: business.name || '',
      countryCode: extractCountryCode(contactInfo.phone),
      phone: extractPhoneNumber(contactInfo.phone),
      email: contactInfo.email || '',
      website: contactInfo.website || '',
      streetAddress: business.streetAddress || '',
      apartment: '',
      city: business.city || '',
      state: business.state || '',
      zipCode: business.zipCode || '',
      country: business.country || '',
      businessTypes: business.businessTypes || [],
      businessDescription: business.description || '',
      piWalletAddress: business.piWalletAddress || '',
      // Monday
      mondayOpen: hours.monday?.open || '09:00',
      mondayClose: hours.monday?.close || '17:00',
      mondayClosed: hours.monday?.closed ?? false,
      // Tuesday
      tuesdayOpen: hours.tuesday?.open || '09:00',
      tuesdayClose: hours.tuesday?.close || '17:00',
      tuesdayClosed: hours.tuesday?.closed ?? false,
      // Wednesday
      wednesdayOpen: hours.wednesday?.open || '09:00',
      wednesdayClose: hours.wednesday?.close || '17:00',
      wednesdayClosed: hours.wednesday?.closed ?? false,
      // Thursday
      thursdayOpen: hours.thursday?.open || '09:00',
      thursdayClose: hours.thursday?.close || '17:00',
      thursdayClosed: hours.thursday?.closed ?? false,
      // Friday
      fridayOpen: hours.friday?.open || '09:00',
      fridayClose: hours.friday?.close || '17:00',
      fridayClosed: hours.friday?.closed ?? false,
      // Saturday
      saturdayOpen: hours.saturday?.open || '10:00',
      saturdayClose: hours.saturday?.close || '16:00',
      saturdayClosed: hours.saturday?.closed ?? false,
      // Sunday
      sundayOpen: hours.sunday?.open || '10:00',
      sundayClose: hours.sunday?.close || '16:00',
      sundayClosed: hours.sunday?.closed ?? false,
    },
  });

  return form;
};
