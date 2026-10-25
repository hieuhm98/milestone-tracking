// Password rules shared by sign-up, the admin reset and the learner's own
// change, so the browser and the server always agree. 72 is bcrypt's limit,
// which is what Supabase Auth hashes with.

export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 72;

export function isValidPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= MIN_PASSWORD && value.length <= MAX_PASSWORD;
}

/** A readable temporary password for an admin to hand over, e.g. `Kite-4827-Moss`. */
export function generatePassword(): string {
  const words = [
    "Kite", "Moss", "Rain", "Lake", "Fern", "Star", "Wave", "Pine", "Cloud", "River",
    "Stone", "Maple", "Coral", "Amber", "Cedar", "Delta", "Ember", "Frost", "Lotus", "Orbit",
  ];
  const pick = (n: number) => {
    const buffer = new Uint32Array(1);

    crypto.getRandomValues(buffer);

    return buffer[0] % n;
  };
  const digits = String(pick(9000) + 1000);

  return `${words[pick(words.length)]}-${digits}-${words[pick(words.length)]}`;
}
