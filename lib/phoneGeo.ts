import { parsePhoneNumber, ParseError } from "libphonenumber-js";
import { COUNTRIES } from "@/lib/countries";

const COUNTRY_NAMES: Record<string, { ar: string; en: string }> = {};
for (const c of COUNTRIES) {
  COUNTRY_NAMES[c.iso] = { ar: c.nameAr, en: c.nameEn };
}

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
