// Static deterministic seed data for suggestions engine (MVP scope)
// Future: could be split by region-specific modules or fetched from a lightweight CMS

export const seasonalByMonth: Record<number, string[]> = {
  1: ["Post-holiday lower crowd levels", "Cold mornings—layering essential"],
  2: ["Late winter shoulder season", "Potential for early festival setup"],
  3: ["Early blossom wave in some regions", "Mild transition weather"],
  4: ["Peak spring bloom in many temperate cities", "Comfortable daytime temps"],
  5: ["Shoulder before summer crowds", "Longer daylight—plan early starts"],
  6: ["Early summer build-up", "Occasional rain depending on region"],
  7: ["High season onset", "Heat management & hydration planning"],
  8: ["Peak summer travel", "Consider indoor afternoon buffers"],
  9: ["Late summer → early autumn shift", "Good window for outdoor morning activities"],
  10: ["Autumn foliage early wave (higher latitudes)", "Cooling evenings"],
  11: ["Shoulder season again—reduced lines", "Early holiday illumination setup"],
  12: ["Holiday illumination peak", "Short daylight—optimize daylight blocks"],
};

export const etiquetteBasics: Record<string, string[]> = {
  japan: [
    "Quiet phone use on trains",
    "Carry some cash for small eateries",
    "Remove shoes where indicated",
  ],
  netherlands: [
    "Cyclists have priority—look both ways on bike lanes",
    "Cards widely accepted, contactless common",
  ],
  france: [
    "Greet with 'Bonjour' before asking questions",
    "Tipping modest; service often included",
  ],
  usa: [
    "15–20% tipping norm in restaurants",
    "Public transit varies widely by city—plan ahead",
  ],
};

export const transitPassHints: Record<string, string> = {
  tokyo: "72-hour subway pass can reduce cost if using >6 rides/day",
  amsterdam: "GVB day ticket helpful if frequent tram + metro transfers",
  london: "Contactless daily cap often cheaper than paper Travelcard",
  paris: "Navigo Easy or day passes if clustering metro-heavy days",
};

// Normalize destination string (lowercase, strip diacritics, take first word if multi-part city/country string)
export function normalizeDestination(dest: string): string {
  return dest
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .split(/[,\s]+/)[0];
}

export interface DeterministicContextInput {
  destination: string;
  firstTravelDate?: string; // ISO date
  daySpan?: number; // inclusive number of days
}

export interface DeterministicSeedsResult {
  month: number | null;
  seasonal: string[];
  etiquette: string[];
  transitPassHint?: string;
  rawDestinationKey: string;
}

export function buildDeterministicSeeds(input: DeterministicContextInput): DeterministicSeedsResult {
  const { destination, firstTravelDate, daySpan } = input;
  const norm = normalizeDestination(destination || '');
  let month: number | null = null;
  if (firstTravelDate) {
    const d = new Date(firstTravelDate);
    if (!isNaN(d.getTime())) month = d.getMonth() + 1;
  }

  const seasonal = month ? seasonalByMonth[month] || [] : [];
  const etiquette = etiquetteBasics[norm] || [];
  const transitPassHint = transitPassHints[norm];

  // Potential future heuristic: adjust seasonal phrasing for hemisphere or daySpan
  return { month, seasonal, etiquette, transitPassHint, rawDestinationKey: norm };
}

export function consolidateSeedStrings(res: DeterministicSeedsResult): string[] {
  const out: string[] = [];
  if (res.seasonal.length) out.push(...res.seasonal.map(s => `Seasonal: ${s}`));
  if (res.etiquette.length) out.push(...res.etiquette.map(s => `Etiquette: ${s}`));
  if (res.transitPassHint) out.push(`Transit: ${res.transitPassHint}`);
  return out;
}
