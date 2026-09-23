// Phone numbers are the learner-facing login. Supabase Auth needs an email for
// password sign-in without an SMS provider, so each phone maps to a fixed,
// never-mailed address on a reserved domain. Learners never see it.

/** Country code assumed for numbers typed in the local `0…` form. */
const DEFAULT_COUNTRY_CODE = "84";

/**
 * Never change this once accounts exist — every stored login email embeds it,
 * so a new domain would lock every existing learner out.
 */
const LOGIN_EMAIL_DOMAIN = process.env.NEXT_PUBLIC_AUTH_EMAIL_DOMAIN || "phone.milestone-tracking.invalid";

/**
 * Normalize a typed phone number to digits with the country code, e.g.
 * "+84 90-123 4567", "0901234567" and "84901234567" all become "84901234567".
 * Returns null when the result is not a plausible phone number.
 */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  let digits = trimmed.replace(/[\s().-]/g, "");

  if (digits.startsWith("+")) {
    digits = digits.slice(1);
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    digits = DEFAULT_COUNTRY_CODE + digits.slice(1);
  }

  if (!/^[0-9]{9,15}$/.test(digits)) return null;

  return digits;
}

/** The Supabase Auth email behind a normalized phone number. */
export function phoneToLoginEmail(phone: string): string {
  return `p${phone}@${LOGIN_EMAIL_DOMAIN}`;
}

/** Display form: "84901234567" → "+84 901234567". */
export function formatPhone(phone: string): string {
  if (phone.startsWith(DEFAULT_COUNTRY_CODE)) return `+${DEFAULT_COUNTRY_CODE} ${phone.slice(DEFAULT_COUNTRY_CODE.length)}`;

  return `+${phone}`;
}
