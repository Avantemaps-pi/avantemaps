import {
  parsePhoneNumberFromString,
  getExampleNumber,
  type CountryCode,
} from 'libphonenumber-js';
import examples from 'libphonenumber-js/mobile/examples';

/**
 * Country calling code to ISO 3166-1 alpha-2 mapping.
 * For codes shared by multiple countries (e.g. +1), the primary is listed first.
 */
const callingCodeToCountry: Record<string, CountryCode> = {
  '+93': 'AF', '+355': 'AL', '+213': 'DZ', '+376': 'AD', '+244': 'AO',
  '+54': 'AR', '+374': 'AM', '+61': 'AU', '+43': 'AT', '+994': 'AZ',
  '+973': 'BH', '+880': 'BD', '+375': 'BY', '+32': 'BE', '+501': 'BZ',
  '+229': 'BJ', '+975': 'BT', '+591': 'BO', '+387': 'BA', '+267': 'BW',
  '+55': 'BR', '+673': 'BN', '+359': 'BG', '+226': 'BF', '+257': 'BI',
  '+855': 'KH', '+237': 'CM', '+1': 'US', '+238': 'CV', '+236': 'CF',
  '+235': 'TD', '+56': 'CL', '+86': 'CN', '+57': 'CO', '+506': 'CR',
  '+385': 'HR', '+53': 'CU', '+357': 'CY', '+420': 'CZ', '+243': 'CD',
  '+45': 'DK', '+253': 'DJ', '+593': 'EC', '+20': 'EG', '+503': 'SV',
  '+372': 'EE', '+251': 'ET', '+679': 'FJ', '+358': 'FI', '+33': 'FR',
  '+241': 'GA', '+220': 'GM', '+995': 'GE', '+49': 'DE', '+233': 'GH',
  '+30': 'GR', '+502': 'GT', '+224': 'GN', '+592': 'GY', '+509': 'HT',
  '+504': 'HN', '+852': 'HK', '+36': 'HU', '+354': 'IS', '+91': 'IN',
  '+62': 'ID', '+98': 'IR', '+964': 'IQ', '+353': 'IE', '+972': 'IL',
  '+39': 'IT', '+225': 'CI', '+876': 'JM', '+81': 'JP', '+962': 'JO',
  '+7': 'RU', '+254': 'KE', '+965': 'KW', '+996': 'KG', '+856': 'LA',
  '+371': 'LV', '+961': 'LB', '+266': 'LS', '+231': 'LR', '+218': 'LY',
  '+370': 'LT', '+352': 'LU', '+853': 'MO', '+389': 'MK', '+261': 'MG',
  '+265': 'MW', '+60': 'MY', '+960': 'MV', '+223': 'ML', '+356': 'MT',
  '+222': 'MR', '+230': 'MU', '+52': 'MX', '+373': 'MD', '+377': 'MC',
  '+976': 'MN', '+382': 'ME', '+212': 'MA', '+258': 'MZ', '+95': 'MM',
  '+264': 'NA', '+977': 'NP', '+31': 'NL', '+64': 'NZ', '+505': 'NI',
  '+227': 'NE', '+234': 'NG', '+850': 'KP', '+47': 'NO', '+968': 'OM',
  '+92': 'PK', '+970': 'PS', '+507': 'PA', '+675': 'PG', '+595': 'PY',
  '+51': 'PE', '+63': 'PH', '+48': 'PL', '+351': 'PT', '+974': 'QA',
  '+242': 'CG', '+40': 'RO', '+250': 'RW', '+966': 'SA', '+221': 'SN',
  '+381': 'RS', '+248': 'SC', '+232': 'SL', '+65': 'SG', '+421': 'SK',
  '+386': 'SI', '+252': 'SO', '+27': 'ZA', '+82': 'KR', '+211': 'SS',
  '+34': 'ES', '+94': 'LK', '+249': 'SD', '+597': 'SR', '+268': 'SZ',
  '+46': 'SE', '+41': 'CH', '+963': 'SY', '+886': 'TW', '+992': 'TJ',
  '+255': 'TZ', '+66': 'TH', '+228': 'TG', '+676': 'TO', '+216': 'TN',
  '+90': 'TR', '+993': 'TM', '+256': 'UG', '+380': 'UA', '+971': 'AE',
  '+44': 'GB', '+598': 'UY', '+998': 'UZ', '+678': 'VU', '+58': 'VE',
  '+84': 'VN', '+967': 'YE', '+260': 'ZM', '+263': 'ZW',
};

/**
 * Get the ISO country code for a calling code string like "+1".
 */
export function getCountryForCallingCode(callingCode: string): CountryCode | undefined {
  return callingCodeToCountry[callingCode];
}

/**
 * Get expected national number length for a country by examining the example number.
 */
export function getExpectedLengthForCountry(callingCode: string): { min: number; max: number } {
  const country = getCountryForCallingCode(callingCode);
  if (!country) return { min: 6, max: 15 };

  try {
    const example = getExampleNumber(country, examples);
    if (example) {
      const nationalNumber = example.nationalNumber;
      const len = nationalNumber.length;
      // Allow ±1 digit flexibility for countries with variable-length numbers
      return { min: Math.max(len - 1, 4), max: len + 2 };
    }
  } catch {
    // fallback
  }
  return { min: 6, max: 15 };
}

/**
 * Validate a phone number using libphonenumber-js.
 * Returns validation status and the parsed phone for display.
 */
export function validatePhoneNumber(
  nationalNumber: string,
  callingCode: string
): { isValid: boolean; isPossible: boolean } {
  if (!nationalNumber) return { isValid: false, isPossible: false };

  const country = getCountryForCallingCode(callingCode);
  if (!country) {
    // Fallback: just check length
    const digits = nationalNumber.replace(/\D/g, '');
    return { isValid: digits.length >= 6, isPossible: digits.length >= 4 };
  }

  try {
    const fullNumber = `${callingCode}${nationalNumber}`;
    const parsed = parsePhoneNumberFromString(fullNumber, country);
    if (parsed) {
      return {
        isValid: parsed.isValid(),
        isPossible: parsed.isPossible(),
      };
    }
  } catch {
    // fallback
  }

  return { isValid: false, isPossible: nationalNumber.length >= 4 };
}
