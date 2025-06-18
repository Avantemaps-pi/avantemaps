
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formSchema, FormValues } from '@/components/business/registration/formSchema';
import { Business } from '@/types/business';

export const useBusinessFormInit = (business: Business) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: 'John', // Mock data
      lastName: 'Doe', // Mock data
      businessName: business.name,
      countryCode: '+1', // Default country code
      phone: '(123) 456-7890', // Mock data
      email: 'contact@example.com', // Mock data
      website: 'https://example.com', // Mock data
      streetAddress: business.address.split(',')[0] || '',
      apartment: '',
      city: business.address.split(',')[1]?.trim() || '',
      state: business.address.split(',')[2]?.trim() || '',
      zipCode: business.address.split(',')[3]?.trim() || '',
      country: business.address.split(',')[4]?.trim() || 'United States',
      businessTypes: ['Restaurant/Cafe'], // Mock data
      businessDescription: business.description,
      piWalletAddress: 'pi1abcdefghijklmnopqrstuvwxyz', // Mock data
      mondayOpen: '09:00',
      mondayClose: '17:00',
      mondayClosed: false,
      tuesdayOpen: '09:00',
      tuesdayClose: '17:00',
      tuesdayClosed: false,
      wednesdayOpen: '09:00',
      wednesdayClose: '17:00',
      wednesdayClosed: false,
      thursdayOpen: '09:00',
      thursdayClose: '17:00',
      thursdayClosed: false,
      fridayOpen: '09:00',
      fridayClose: '17:00',
      fridayClosed: false,
      saturdayOpen: '10:00',
      saturdayClose: '16:00',
      saturdayClosed: false,
      sundayOpen: '10:00',
      sundayClose: '16:00', 
      sundayClosed: false,
    },
  });

  return form;
};
