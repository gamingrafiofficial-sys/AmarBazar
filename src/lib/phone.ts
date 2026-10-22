// Bangladeshi Phone Number Normalization & Validation Helper

export function convertBengaliDigits(str: string): string {
  if (!str) return '';
  const bnToEnMap: Record<string, string> = {
    '০': '0',
    '১': '1',
    '২': '2',
    '৩': '3',
    '৪': '4',
    '৫': '5',
    '৬': '6',
    '৭': '7',
    '৮': '8',
    '৯': '9',
  };
  return str.toString().replace(/[০-৯]/g, (digit) => bnToEnMap[digit] || digit);
}

/**
 * Normalizes any Bangladeshi phone number input into standard 11-digit format:
 * e.g. 01712345678
 * Handles:
 * - Bengali numerals: ০১৭১২৩৪৫৬৭৮ -> 01712345678
 * - Country code prefixes: +88017..., 88017... -> 017...
 * - Punctuation & spaces: 01712-345 678, (017) 12345678 -> 01712345678
 * - Missing leading zero: 1712345678 (10 digits starting with 1) -> 01712345678
 */
export function normalizePhone(phone: string | number | undefined | null): string {
  if (!phone) return '';
  const converted = convertBengaliDigits(phone.toString());
  let clean = converted.replace(/[\s\-\+\(\)\.\/]/g, '').trim();

  // Strip international prefix if present
  if (clean.startsWith('880')) {
    clean = '0' + clean.slice(3);
  } else if (clean.startsWith('88')) {
    clean = clean.slice(2);
  }

  // If 10 digits starting with 1 (e.g. 17xxxxxxxx, 18xxxxxxxx, 19xxxxxxxx)
  if (clean.length === 10 && clean.startsWith('1')) {
    clean = '0' + clean;
  }

  return clean;
}

/**
 * Checks if a phone number is a valid 11-digit Bangladeshi mobile number
 * (Starts with 013, 014, 015, 016, 017, 018, 019)
 */
export function isValidBangladeshiPhone(phone: string | number | undefined | null): boolean {
  const norm = normalizePhone(phone);
  return /^01[3-9]\d{8}$/.test(norm);
}

/**
 * Formats phone number for display with standard spacing: e.g. 01712 345678
 */
export function formatPhoneDisplay(phone: string | number | undefined | null): string {
  const norm = normalizePhone(phone);
  if (norm.length === 11) {
    return `${norm.slice(0, 5)} ${norm.slice(5)}`;
  }
  return norm || (phone ? phone.toString() : '');
}
