
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFormContext } from 'react-hook-form';
import { FormValues } from './formSchema';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Extended country codes list
const countryCodes = [
  { code: '+93', country: 'Afghanistan' },
  { code: '+355', country: 'Albania' },
  { code: '+213', country: 'Algeria' },
  { code: '+376', country: 'Andorra' },
  { code: '+244', country: 'Angola' },
  { code: '+54', country: 'Argentina' },
  { code: '+374', country: 'Armenia' },
  { code: '+61', country: 'Australia' },
  { code: '+43', country: 'Austria' },
  { code: '+994', country: 'Azerbaijan' },
  { code: '+973', country: 'Bahrain' },
  { code: '+880', country: 'Bangladesh' },
  { code: '+375', country: 'Belarus' },
  { code: '+32', country: 'Belgium' },
  { code: '+501', country: 'Belize' },
  { code: '+229', country: 'Benin' },
  { code: '+975', country: 'Bhutan' },
  { code: '+591', country: 'Bolivia' },
  { code: '+387', country: 'Bosnia and Herzegovina' },
  { code: '+267', country: 'Botswana' },
  { code: '+55', country: 'Brazil' },
  { code: '+673', country: 'Brunei' },
  { code: '+359', country: 'Bulgaria' },
  { code: '+226', country: 'Burkina Faso' },
  { code: '+257', country: 'Burundi' },
  { code: '+855', country: 'Cambodia' },
  { code: '+237', country: 'Cameroon' },
  { code: '+1', country: 'Canada' },
  { code: '+238', country: 'Cape Verde' },
  { code: '+236', country: 'Central African Republic' },
  { code: '+235', country: 'Chad' },
  { code: '+56', country: 'Chile' },
  { code: '+86', country: 'China' },
  { code: '+57', country: 'Colombia' },
  { code: '+506', country: 'Costa Rica' },
  { code: '+385', country: 'Croatia' },
  { code: '+53', country: 'Cuba' },
  { code: '+357', country: 'Cyprus' },
  { code: '+420', country: 'Czech Republic' },
  { code: '+243', country: 'Democratic Republic of the Congo' },
  { code: '+45', country: 'Denmark' },
  { code: '+253', country: 'Djibouti' },
  { code: '+593', country: 'Ecuador' },
  { code: '+20', country: 'Egypt' },
  { code: '+503', country: 'El Salvador' },
  { code: '+372', country: 'Estonia' },
  { code: '+251', country: 'Ethiopia' },
  { code: '+679', country: 'Fiji' },
  { code: '+358', country: 'Finland' },
  { code: '+33', country: 'France' },
  { code: '+241', country: 'Gabon' },
  { code: '+220', country: 'Gambia' },
  { code: '+995', country: 'Georgia' },
  { code: '+49', country: 'Germany' },
  { code: '+233', country: 'Ghana' },
  { code: '+30', country: 'Greece' },
  { code: '+502', country: 'Guatemala' },
  { code: '+224', country: 'Guinea' },
  { code: '+592', country: 'Guyana' },
  { code: '+509', country: 'Haiti' },
  { code: '+504', country: 'Honduras' },
  { code: '+852', country: 'Hong Kong' },
  { code: '+36', country: 'Hungary' },
  { code: '+354', country: 'Iceland' },
  { code: '+91', country: 'India' },
  { code: '+62', country: 'Indonesia' },
  { code: '+98', country: 'Iran' },
  { code: '+964', country: 'Iraq' },
  { code: '+353', country: 'Ireland' },
  { code: '+972', country: 'Israel' },
  { code: '+39', country: 'Italy' },
  { code: '+225', country: 'Ivory Coast' },
  { code: '+876', country: 'Jamaica' },
  { code: '+81', country: 'Japan' },
  { code: '+962', country: 'Jordan' },
  { code: '+7', country: 'Kazakhstan' },
  { code: '+254', country: 'Kenya' },
  { code: '+965', country: 'Kuwait' },
  { code: '+996', country: 'Kyrgyzstan' },
  { code: '+856', country: 'Laos' },
  { code: '+371', country: 'Latvia' },
  { code: '+961', country: 'Lebanon' },
  { code: '+266', country: 'Lesotho' },
  { code: '+231', country: 'Liberia' },
  { code: '+218', country: 'Libya' },
  { code: '+370', country: 'Lithuania' },
  { code: '+352', country: 'Luxembourg' },
  { code: '+853', country: 'Macau' },
  { code: '+389', country: 'Macedonia' },
  { code: '+261', country: 'Madagascar' },
  { code: '+265', country: 'Malawi' },
  { code: '+60', country: 'Malaysia' },
  { code: '+960', country: 'Maldives' },
  { code: '+223', country: 'Mali' },
  { code: '+356', country: 'Malta' },
  { code: '+222', country: 'Mauritania' },
  { code: '+230', country: 'Mauritius' },
  { code: '+52', country: 'Mexico' },
  { code: '+373', country: 'Moldova' },
  { code: '+377', country: 'Monaco' },
  { code: '+976', country: 'Mongolia' },
  { code: '+382', country: 'Montenegro' },
  { code: '+212', country: 'Morocco' },
  { code: '+258', country: 'Mozambique' },
  { code: '+95', country: 'Myanmar' },
  { code: '+264', country: 'Namibia' },
  { code: '+977', country: 'Nepal' },
  { code: '+31', country: 'Netherlands' },
  { code: '+64', country: 'New Zealand' },
  { code: '+505', country: 'Nicaragua' },
  { code: '+227', country: 'Niger' },
  { code: '+234', country: 'Nigeria' },
  { code: '+850', country: 'North Korea' },
  { code: '+47', country: 'Norway' },
  { code: '+968', country: 'Oman' },
  { code: '+92', country: 'Pakistan' },
  { code: '+970', country: 'Palestine' },
  { code: '+507', country: 'Panama' },
  { code: '+675', country: 'Papua New Guinea' },
  { code: '+595', country: 'Paraguay' },
  { code: '+51', country: 'Peru' },
  { code: '+63', country: 'Philippines' },
  { code: '+48', country: 'Poland' },
  { code: '+351', country: 'Portugal' },
  { code: '+974', country: 'Qatar' },
  { code: '+242', country: 'Republic of the Congo' },
  { code: '+40', country: 'Romania' },
  { code: '+7', country: 'Russia' },
  { code: '+250', country: 'Rwanda' },
  { code: '+966', country: 'Saudi Arabia' },
  { code: '+221', country: 'Senegal' },
  { code: '+381', country: 'Serbia' },
  { code: '+248', country: 'Seychelles' },
  { code: '+232', country: 'Sierra Leone' },
  { code: '+65', country: 'Singapore' },
  { code: '+421', country: 'Slovakia' },
  { code: '+386', country: 'Slovenia' },
  { code: '+252', country: 'Somalia' },
  { code: '+27', country: 'South Africa' },
  { code: '+82', country: 'South Korea' },
  { code: '+211', country: 'South Sudan' },
  { code: '+34', country: 'Spain' },
  { code: '+94', country: 'Sri Lanka' },
  { code: '+249', country: 'Sudan' },
  { code: '+597', country: 'Suriname' },
  { code: '+268', country: 'Swaziland' },
  { code: '+46', country: 'Sweden' },
  { code: '+41', country: 'Switzerland' },
  { code: '+963', country: 'Syria' },
  { code: '+886', country: 'Taiwan' },
  { code: '+992', country: 'Tajikistan' },
  { code: '+255', country: 'Tanzania' },
  { code: '+66', country: 'Thailand' },
  { code: '+228', country: 'Togo' },
  { code: '+676', country: 'Tonga' },
  { code: '+216', country: 'Tunisia' },
  { code: '+90', country: 'Turkey' },
  { code: '+993', country: 'Turkmenistan' },
  { code: '+256', country: 'Uganda' },
  { code: '+380', country: 'Ukraine' },
  { code: '+971', country: 'UAE' },
  { code: '+44', country: 'United Kingdom' },
  { code: '+1', country: 'United States' },
  { code: '+598', country: 'Uruguay' },
  { code: '+998', country: 'Uzbekistan' },
  { code: '+678', country: 'Vanuatu' },
  { code: '+58', country: 'Venezuela' },
  { code: '+84', country: 'Vietnam' },
  { code: '+967', country: 'Yemen' },
  { code: '+260', country: 'Zambia' },
  { code: '+263', country: 'Zimbabwe' },
];

// Map country names to country codes
const getCountryCodeFromCountry = (country: string): string => {
  const normalized = country.toLowerCase().trim();
  const match = countryCodes.find(c => c.country.toLowerCase() === normalized);
  return match?.code || '+1'; // Default to +1 if not found
};

interface ContactTabProps {
  onNext: () => void;
  onPrevious: () => void;
  disabled?: boolean;
}

const ContactTab: React.FC<ContactTabProps> = ({ onNext, onPrevious, disabled }) => {
  const form = useFormContext<FormValues>();
  
  // Initialize countryCode based on the country from address section
  const [countryCode, setCountryCode] = React.useState(() => {
    const formCountryCode = form.getValues("countryCode");
    if (formCountryCode) return formCountryCode;
    
    // Get country from address section and map to country code
    const addressCountry = form.getValues("country");
    if (addressCountry) {
      const mappedCode = getCountryCodeFromCountry(addressCountry);
      form.setValue("countryCode", mappedCode);
      return mappedCode;
    }
    
    return "+1";
  });

  // Update countryCode in the form when it changes
  const handleCountryCodeChange = (value: string) => {
    setCountryCode(value);
    form.setValue("countryCode", value);
  };

// Phone digit length expectations per country code
  const getExpectedDigits = (code: string): { min: number; max: number } => {
    const digitMap: Record<string, { min: number; max: number }> = {
      '+1': { min: 10, max: 10 },     // US/Canada
      '+44': { min: 10, max: 10 },     // UK
      '+91': { min: 10, max: 10 },     // India
      '+61': { min: 9, max: 9 },       // Australia
      '+86': { min: 11, max: 11 },     // China
      '+81': { min: 10, max: 10 },     // Japan
      '+49': { min: 10, max: 11 },     // Germany
      '+33': { min: 9, max: 9 },       // France
      '+55': { min: 10, max: 11 },     // Brazil
      '+52': { min: 10, max: 10 },     // Mexico
      '+82': { min: 9, max: 10 },      // South Korea
      '+39': { min: 9, max: 10 },      // Italy
      '+34': { min: 9, max: 9 },       // Spain
      '+7': { min: 10, max: 10 },      // Russia/Kazakhstan
      '+63': { min: 10, max: 10 },     // Philippines
      '+234': { min: 10, max: 10 },    // Nigeria
      '+27': { min: 9, max: 9 },       // South Africa
      '+62': { min: 9, max: 12 },      // Indonesia
      '+60': { min: 9, max: 10 },      // Malaysia
      '+65': { min: 8, max: 8 },       // Singapore
      '+66': { min: 9, max: 9 },       // Thailand
      '+84': { min: 9, max: 10 },      // Vietnam
      '+20': { min: 10, max: 10 },     // Egypt
      '+971': { min: 9, max: 9 },      // UAE
      '+966': { min: 9, max: 9 },      // Saudi Arabia
      '+90': { min: 10, max: 10 },     // Turkey
      '+48': { min: 9, max: 9 },       // Poland
      '+380': { min: 9, max: 9 },      // Ukraine
      '+31': { min: 9, max: 9 },       // Netherlands
      '+46': { min: 9, max: 9 },       // Sweden
      '+47': { min: 8, max: 8 },       // Norway
      '+41': { min: 9, max: 9 },       // Switzerland
      '+351': { min: 9, max: 9 },      // Portugal
      '+64': { min: 9, max: 10 },      // New Zealand
      '+254': { min: 9, max: 9 },      // Kenya
      '+92': { min: 10, max: 10 },     // Pakistan
      '+880': { min: 10, max: 10 },    // Bangladesh
    };
    return digitMap[code] || { min: 6, max: 15 }; // Default fallback
  };

  const expectedDigits = getExpectedDigits(countryCode);
  const currentPhone = form.watch('phone') || '';
  const phoneLength = currentPhone.replace(/[^0-9]/g, '').length;
  const isPhoneLengthValid = phoneLength === 0 || (phoneLength >= expectedDigits.min && phoneLength <= expectedDigits.max);

  // Handle phone input to only allow numbers
  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Replace any non-numeric character with empty string
    const numericValue = value.replace(/[^0-9]/g, '');
    // Limit to max expected digits
    const trimmed = numericValue.slice(0, expectedDigits.max);
    form.setValue('phone', trimmed);
  };

  return (
    <div className="w-full">
      <Card className="border shadow-sm">
      <CardHeader className="pb-4 space-y-2">
        <CardTitle className="text-2xl sm:text-xl">Contact Details</CardTitle>
        <CardDescription className="text-base sm:text-sm">
          How customers can reach your business.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base mb-1.5">Contact Number *</FormLabel>
              <div className="flex space-x-2">
                <Select
                  value={countryCode}
                  onValueChange={handleCountryCodeChange}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-[70px] flex-shrink-0">
                    <SelectValue placeholder="+1" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto bg-background z-50">
                    {countryCodes.map((country) => (
                      <SelectItem key={`${country.code}-${country.country}`} value={country.code}>
                        {country.code} {country.country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormControl>
                  <Input 
                    id="phone"
                    placeholder="555-123-4567"
                    {...field}
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="tel"
                    onChange={(e) => {
                      handlePhoneInput(e);
                    }}
                    disabled={disabled}
                  />
                </FormControl>
              </div>
              <FormMessage />
              {!isPhoneLengthValid && phoneLength > 0 && (
                <p className="text-sm font-medium text-destructive">
                  {expectedDigits.min === expectedDigits.max
                    ? `Phone number must be ${expectedDigits.min} digits for this country code`
                    : `Phone number must be ${expectedDigits.min}-${expectedDigits.max} digits for this country code`}
                </p>
              )}
              {isPhoneLengthValid && phoneLength > 0 && (
                <p className="text-xs text-muted-foreground">
                  {phoneLength}/{expectedDigits.min === expectedDigits.max ? expectedDigits.min : `${expectedDigits.min}-${expectedDigits.max}`} digits
                </p>
              )}
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base mb-1.5">Email Address *</FormLabel>
              <FormControl>
                <Input 
                  id="email"
                  placeholder="contact@business.com" 
                  type="email"
                  autoComplete="email"
                  {...field} 
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base mb-1.5">Pi Network Website URL (Optional)</FormLabel>
              <FormControl>
                <Input 
                  id="website"
                  placeholder="https://example.pinet.com" 
                  type="url"
                  autoComplete="url"
                  {...field} 
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrevious}
          disabled={disabled}
        >
          Back
        </Button>
        <Button 
          type="button" 
          className="bg-avante-blue hover:bg-avante-blue/90"
          onClick={onNext}
          disabled={disabled}
        >
          Next
        </Button>
      </CardFooter>
      </Card>
    </div>
  );
};

export default ContactTab;
