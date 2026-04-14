/** Major cities grouped by ISO country code — MENA-focused */
export const CITIES_BY_COUNTRY: Record<string, string[]> = {
  EG: [
    "Cairo", "Alexandria", "Giza", "Shubra El Kheima", "Port Said", "Suez",
    "Mansoura", "Tanta", "Asyut", "Faiyum", "Zagazig", "Ismailia", "Kafr el-Sheikh",
    "Damietta", "Luxor", "Qena", "Aswan", "Sohag", "Beni Suef", "Minya",
    "Hurghada", "Sharm El-Sheikh", "Nasr City", "Heliopolis", "Maadi", "6th of October",
    "Obour", "Shorouk", "New Cairo", "10th of Ramadan", "Mahalla El Kubra",
  ],
  SA: [
    "Riyadh", "Jeddah", "Mecca", "Medina", "Dammam", "Khobar", "Dhahran",
    "Jubail", "Abha", "Tabuk", "Buraidah", "Hail", "Taif", "Najran", "Jizan",
    "Yanbu", "Al Ahsa", "Al Kharj", "Qatif", "Arar", "Sakaka", "Wajh",
    "Unaizah", "Rafha", "Turaif",
  ],
  AE: [
    "Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah",
    "Umm Al Quwain", "Al Ain", "Khalifa City", "Mussafah", "Deira", "Bur Dubai",
    "Jumeirah", "Marina", "Business Bay", "Downtown Dubai", "JLT", "Silicon Oasis",
  ],
  KW: [
    "Kuwait City", "Salmiya", "Hawalli", "Farwaniya", "Ahmadi", "Jahra",
    "Mubarak Al Kabeer", "Fahaheel", "Mangaf", "Abu Halifa",
  ],
  QA: [
    "Doha", "Al Rayyan", "Al Wakrah", "Al Khor", "Lusail", "Mesaieed",
    "Dukhan", "Madinat ash Shamal",
  ],
  BH: [
    "Manama", "Riffa", "Muharraq", "Hamad Town", "Isa Town", "Sitra",
    "Budaiya", "Jidhafs", "Zallaq",
  ],
  OM: [
    "Muscat", "Salalah", "Sohar", "Nizwa", "Sur", "Ibri", "Barka", "Rustaq",
    "Khasab", "Duqm",
  ],
  JO: [
    "Amman", "Zarqa", "Irbid", "Russeifa", "Aqaba", "Salt", "Madaba",
    "Jerash", "Mafraq", "Karak",
  ],
  LB: [
    "Beirut", "Tripoli", "Sidon", "Tyre", "Jounieh", "Zahle", "Baalbek",
    "Nabatieh", "Jbeil",
  ],
  MA: [
    "Casablanca", "Rabat", "Fes", "Marrakech", "Agadir", "Tangier", "Meknes",
    "Oujda", "Kenitra", "Tetouan", "Safi", "El Jadida", "Nador", "Beni Mellal",
  ],
  DZ: [
    "Algiers", "Oran", "Constantine", "Annaba", "Blida", "Batna", "Djelfa",
    "Sétif", "Sidi Bel Abbès", "Biskra", "Tebessa", "El Oued", "Skikda",
    "Tiaret", "Bejaïa",
  ],
  TN: [
    "Tunis", "Sfax", "Sousse", "Kairouan", "Bizerte", "Gabès", "Gafsa",
    "Monastir", "Nabeul", "Hammamet", "La Marsa", "Ariana",
  ],
  IQ: [
    "Baghdad", "Basra", "Mosul", "Erbil", "Najaf", "Karbala", "Kirkuk",
    "Sulaymaniyah", "Tikrit", "Duhok", "Ramadi", "Fallujah", "Samarra",
  ],
  LY: [
    "Tripoli", "Benghazi", "Misrata", "Tobruk", "Zawiya", "Zliten", "Derna",
    "Sabha", "Zintan",
  ],
  SD: [
    "Khartoum", "Omdurman", "Port Sudan", "Kassala", "Obeid", "Wad Madani",
    "Juba", "Nyala",
  ],
  TR: [
    "Istanbul", "Ankara", "Izmir", "Bursa", "Antalya", "Adana", "Konya",
    "Gaziantep", "Mersin", "Kayseri", "Eskişehir", "Diyarbakır", "Samsun",
  ],
  US: [
    "New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia",
    "San Antonio", "San Diego", "Dallas", "San Jose", "Austin", "Jacksonville",
    "Miami", "Seattle", "Denver", "Boston", "Detroit", "Atlanta",
  ],
  GB: [
    "London", "Birmingham", "Manchester", "Leeds", "Sheffield", "Liverpool",
    "Bristol", "Leicester", "Edinburgh", "Cardiff", "Glasgow", "Belfast",
  ],
  DE: [
    "Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt", "Stuttgart",
    "Düsseldorf", "Leipzig", "Dortmund", "Essen", "Bremen", "Dresden",
  ],
  FR: [
    "Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Strasbourg",
    "Montpellier", "Bordeaux", "Lille", "Rennes",
  ],
};

export const OTHER_CITY_VALUE = "__other__";

export function getCitiesForCountry(countryIso: string): string[] {
  return CITIES_BY_COUNTRY[countryIso.toUpperCase()] ?? [];
}
