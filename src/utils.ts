/**
 * Safe utility to parse standard numbers, fractions, and basic arithmetic expressions.
 * For example: "1/4", "1/2", "0.5", "1 + 1/2", etc.
 */
export function parseFractionOrExpression(val: string | number): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const s = val.trim();
  if (!s) return 0;

  // Simple quick check for single fraction like "1/4" or "2/3" or "0.25"
  if (/^\d+\s*\/\s*\d+$/.test(s)) {
    const parts = s.split('/');
    const cleanNum = parseFloat(parts[0]);
    const cleanDen = parseFloat(parts[1]);
    if (cleanDen !== 0) {
      return Number((cleanNum / cleanDen).toFixed(4));
    }
  }

  // General safe parser for basic arithmetic expressions (using only digits, +, -, *, /, ., spaces, brackets)
  try {
    if (/^[0-9+\-*/().\s]+$/.test(s)) {
      // Safe custom math evaluator avoiding eval() / new Function() to comply with Content Security Policy
      const tokens = s.match(/\d+(\.\d+)?|[+\-*/()]/g) || [];
      let index = 0;

      const peek = () => tokens[index];
      const consume = (expected?: string) => {
        const token = tokens[index];
        if (expected && token !== expected) throw new Error();
        index++;
        return token;
      };

      const parseFactor = (): number => {
        const next = peek();
        if (next === '-') {
          consume('-');
          return -parseFactor();
        }
        if (next === '+') {
          consume('+');
          return parseFactor();
        }
        if (next === '(') {
          consume('(');
          const val = expr();
          consume(')');
          return val;
        }
        const token = consume();
        const parsedVal = parseFloat(token);
        if (isNaN(parsedVal)) throw new Error();
        return parsedVal;
      };

      const term = (): number => {
        let val = parseFactor();
        while (true) {
          const next = peek();
          if (next === '*') {
            consume('*');
            val *= parseFactor();
          } else if (next === '/') {
            consume('/');
            const divisor = parseFactor();
            if (divisor === 0) throw new Error();
            val /= divisor;
          } else {
            break;
          }
        }
        return val;
      };

      const expr = (): number => {
        let val = term();
        while (true) {
          const next = peek();
          if (next === '+') {
            consume('+');
            val += term();
          } else if (next === '-') {
            consume('-');
            val -= term();
          } else {
            break;
          }
        }
        return val;
      };

      const result = expr();
      if (index === tokens.length && typeof result === 'number' && !isNaN(result)) {
        return Number(result.toFixed(4));
      }
    }
  } catch (_) {}

  // Standard float parser fallback
  const parsed = parseFloat(s);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Clean leading zeros from numeric inputs while typing, preserving decimals (like "0.5") and single zeros.
 */
export function cleanLeadingZeros(val: string): string {
  const trimmed = val.trim();
  
  // E.g., "05" -> "5", "005" -> "5", but keep "0.5" or "0"
  if (/^0+[1-9]/.test(trimmed)) {
    return trimmed.replace(/^0+/, '');
  }
  
  // Also handle sequence of multiple zeros, e.g., "00" or "000" -> "0"
  if (/^0+$/.test(trimmed)) {
    return '0';
  }
  
  return val;
}

/**
 * Format helper for showing fractional values human-readably if they correspond to common fractions.
 */
export function formatAsFractionLabel(num: number): string {
  if (num === 0.25) return '1/4';
  if (num === 0.5) return '1/2';
  if (num === 0.75) return '3/4';
  if (num === 0.125) return '1/8';
  if (num === 0.3333) return '1/3';
  return num.toString();
}

export type ContactType = 'empty' | 'phone' | 'link' | 'username' | 'invalid-phone';
export type UsernameOpenPreference = 'whatsapp' | 'telegram';

export interface ContactInfo {
  type: ContactType;
  raw: string;
  normalized: string;
  display: string;
  error?: string;
}

const DEFAULT_CONTACT_COUNTRY_CODE = '251';
const USERNAME_OPEN_PREFERENCE_KEY = 'mena_inc_username_contact_preference_v1';

const stripPhoneExtension = (value: string) => value.replace(/\s*(ext\.?|x)\s*\d+$/i, '').trim();

export function detectContactType(value: string): ContactType {
  const raw = value.trim();
  if (!raw) return 'empty';
  if (/^(https?:\/\/|mailto:|tg:\/\/|whatsapp:\/\/|www\.)/i.test(raw)) return 'link';
  if (/^@?[a-zA-Z][a-zA-Z0-9_.-]{2,}$/.test(raw) && !raw.includes(' ')) return 'username';

  const phoneCandidate = stripPhoneExtension(raw);
  if (/^[+()\d\s.-]+$/.test(phoneCandidate) && /\d/.test(phoneCandidate)) {
    return normalizePhoneNumber(raw).error ? 'invalid-phone' : 'phone';
  }

  return 'username';
}

export function normalizePhoneNumber(value: string, defaultCountryCode = DEFAULT_CONTACT_COUNTRY_CODE): ContactInfo {
  const raw = value.trim();
  if (!raw) {
    return { type: 'empty', raw, normalized: '', display: '-', error: undefined };
  }

  const withoutExtension = stripPhoneExtension(raw);
  const hasInternationalPrefix = withoutExtension.startsWith('+') || withoutExtension.startsWith('00');
  let digits = withoutExtension.replace(/[^\d]/g, '');

  if (withoutExtension.startsWith('00')) {
    digits = digits.replace(/^00/, '');
  } else if (!hasInternationalPrefix) {
    digits = digits.replace(/^0+/, '');
    digits = `${defaultCountryCode}${digits}`;
  }

  if (digits.length < 8 || digits.length > 15) {
    return {
      type: 'invalid-phone',
      raw,
      normalized: '',
      display: raw,
      error: 'Enter a valid phone number, link, or username. Phone numbers should include enough digits for international format.',
    };
  }

  const normalized = `+${digits}`;
  return {
    type: 'phone',
    raw,
    normalized,
    display: normalized,
  };
}

export function formatContactDisplay(value: string): ContactInfo {
  const raw = value.trim();
  const detected = detectContactType(raw);

  if (detected === 'phone' || detected === 'invalid-phone') {
    return normalizePhoneNumber(raw);
  }

  if (detected === 'link') {
    return {
      type: 'link',
      raw,
      normalized: raw,
      display: raw.replace(/^https?:\/\//i, '').replace(/^www\./i, ''),
    };
  }

  if (detected === 'username') {
    const username = raw.replace(/^@/, '');
    return {
      type: 'username',
      raw,
      normalized: username,
      display: `@${username}`,
    };
  }

  return { type: 'empty', raw, normalized: '', display: '-', error: undefined };
}

export function createTelUrl(phoneE164: string): string {
  return `tel:${phoneE164}`;
}

export function createSmsUrl(phoneE164: string): string {
  return `sms:${phoneE164}`;
}

export function createWhatsAppUrl(contact: string): string {
  const normalized = normalizePhoneNumber(contact);
  if (normalized.type === 'phone') {
    return `https://wa.me/${normalized.normalized.replace(/[^\d]/g, '')}`;
  }
  return `https://wa.me/${contact.replace(/^@/, '')}`;
}

export function createTelegramUrl(username: string): string {
  return `https://t.me/${username.replace(/^@/, '')}`;
}

export function createLinkUrl(link: string): string {
  if (/^(https?:\/\/|mailto:|tg:\/\/|whatsapp:\/\/)/i.test(link)) return link;
  return `https://${link.replace(/^www\./i, 'www.')}`;
}

export function saveUsernameOpenPreference(preference: UsernameOpenPreference): void {
  localStorage.setItem(USERNAME_OPEN_PREFERENCE_KEY, preference);
}
