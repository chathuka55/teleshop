/**
 * Storefront search terms (docs/09 GET /products `q`). Pure — unit tested.
 *
 * The text index only matches whole words in the product name / model ("iph" or "laptop" find
 * nothing), so search first matches every typed word as a word *prefix* against the product
 * name, model, brand and category; the text index is the fallback (docs/09 §products).
 */

export const MAX_TERMS = 6;
const MAX_TERM_LENGTH = 40;

const escapeRegex = (v: string): string => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Lower-cased words of the query (max 6), plural "s"/"es" dropped so "laptops" finds "Laptop". */
export function searchTerms(q: string): string[] {
  const words = q
    .toLowerCase()
    .normalize("NFKC")
    .split(/[^\p{L}\p{N}.+#-]+/u)
    .map((w) => w.replace(/^[.+#-]+|[.-]+$/g, "").slice(0, MAX_TERM_LENGTH))
    .filter(Boolean);
  const stems = words.map((w) => (w.length > 3 && /[a-z]s$/.test(w) ? w.replace(/(?:es|s)$/, "") : w));
  return [...new Set(stems)].slice(0, MAX_TERMS);
}

/** Case-insensitive "a word starts with <term>" — the term is escaped, so it is a literal. */
export function wordPrefixRegex(term: string): RegExp {
  // ASCII class + "i" only: the same RegExp also runs inside MongoDB (PCRE), which may not take \p{…}.
  // eslint-disable-next-line security/detect-non-literal-regexp -- escaped literal, length-capped
  return new RegExp(`(?:^|[^a-z0-9])${escapeRegex(term)}`, "i");
}

/** Ids of the named things (brands, categories) whose name or slug has a word starting with the term. */
export function idsMatching<T extends { _id: unknown; name: string; slug: string }>(
  items: readonly T[],
  term: string,
): T["_id"][] {
  const re = wordPrefixRegex(term);
  return items.filter((i) => re.test(i.name) || re.test(i.slug.replace(/-/g, " "))).map((i) => i._id);
}
