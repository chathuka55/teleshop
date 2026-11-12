import { describe, expect, it } from "vitest";
import { idsMatching, MAX_TERMS, searchTerms, wordPrefixRegex } from "@/db/repositories/search-terms";

describe("searchTerms", () => {
  it("lower-cases, splits on spaces/punctuation and de-duplicates", () => {
    expect(searchTerms("  iPhone 17,  PRO  pro ")).toEqual(["iphone", "17", "pro"]);
  });

  it("drops plural endings so the singular product name still matches", () => {
    expect(searchTerms("laptops phones watches")).toEqual(["laptop", "phon", "watch"]);
    expect(searchTerms("ps5 ios")).toEqual(["ps5", "ios"]); // short words are kept as typed
  });

  it("keeps model-number characters and caps the number of words", () => {
    expect(searchTerms("RTX-5080 9800X3D c++")).toEqual(["rtx-5080", "9800x3d", "c++"]);
    expect(searchTerms("a b c d e f g h")).toHaveLength(MAX_TERMS);
    expect(searchTerms("   ")).toEqual([]);
  });
});

describe("wordPrefixRegex", () => {
  it("matches the start of any word, case-insensitively", () => {
    const re = wordPrefixRegex("iph");
    expect(re.test("Apple iPhone 17")).toBe(true);
    expect(re.test("Graphics")).toBe(false); // not at a word start
    expect(wordPrefixRegex("17 pro").test("Apple iPhone 17 Pro Max")).toBe(true);
  });

  it("escapes regex syntax so user input is literal", () => {
    expect(wordPrefixRegex(".*").test("anything")).toBe(false);
    expect(wordPrefixRegex("c++").test("Learn C++ today")).toBe(true);
  });
});

describe("idsMatching", () => {
  const cats = [
    { _id: 1, name: "Mobile Phones", slug: "mobile-phones" },
    { _id: 2, name: "Laptops", slug: "laptops" },
    { _id: 3, name: "PC Components", slug: "pc-components" },
  ];
  it("matches category / brand names by word prefix", () => {
    expect(idsMatching(cats, "phon")).toEqual([1]);
    expect(idsMatching(cats, "laptop")).toEqual([2]);
    expect(idsMatching(cats, "comp")).toEqual([3]);
    expect(idsMatching(cats, "tops")).toEqual([]);
  });
});
