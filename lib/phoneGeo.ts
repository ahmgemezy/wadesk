import { parsePhoneNumber, ParseError } from "libphonenumber-js";

const COUNTRY_NAMES: Record<string, { ar: string; en: string }> = {
  EG: { ar: "مصر", en: "Egypt" },
  SA: { ar: "السعودية", en: "Saudi Arabia" },
  AE: { ar: "الإمارات", en: "UAE" },
  KW: { ar: "الكويت", en: "Kuwait" },
  QA: { ar: "قطر", en: "Qatar" },
  BH: { ar: "البحرين", en: "Bahrain" },
  OM: { ar: "عُمان", en: "Oman" },
  JO: { ar: "الأردن", en: "Jordan" },
  LB: { ar: "لبنان", en: "Lebanon" },
  MA: { ar: "المغرب", en: "Morocco" },
  DZ: { ar: "الجزائر", en: "Algeria" },
  TN: { ar: "تونس", en: "Tunisia" },
  IQ: { ar: "العراق", en: "Iraq" },
  LY: { ar: "ليبيا", en: "Libya" },
  SD: { ar: "السودان", en: "Sudan" },
  TR: { ar: "تركيا", en: "Turkey" },
  US: { ar: "الولايات المتحدة", en: "United States" },
  GB: { ar: "المملكة المتحدة", en: "United Kingdom" },
  DE: { ar: "ألمانيا", en: "Germany" },
  FR: { ar: "فرنسا", en: "France" },
};

export type GeoResult = {
  countryIso: string;
  countryAr: string;
  countryEn: string;
};

export function getCountryFromPhone(phone: string): GeoResult | null {
  try {
    const parsed = parsePhoneNumber(phone);
    if (!parsed || !parsed.country) return null;
    const iso = parsed.country;
    const names = COUNTRY_NAMES[iso];
    return {
      countryIso: iso,
      countryAr: names?.ar ?? iso,
      countryEn: names?.en ?? iso,
    };
  } catch (e) {
    if (e instanceof ParseError) return null;
    return null;
  }
}
