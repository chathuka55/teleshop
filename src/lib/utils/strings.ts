/** "Chathuka Jayasekara" → "CJ". */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** "+94771234567" → "077 123 4567" (local format for display). Unknown formats pass through. */
export function formatPhoneLK(e164: string): string {
  const m = /^\+94(\d{2})(\d{3})(\d{4})$/.exec(e164);
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : e164;
}

/** "Nimal Perera" → "Nimal P." — reviews never show a customer's full name. */
export function publicReviewerName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return "Teleshop customer";
  const last = parts.length > 1 ? parts[parts.length - 1] : undefined;
  return last ? `${first} ${last.charAt(0).toUpperCase()}.` : first;
}
