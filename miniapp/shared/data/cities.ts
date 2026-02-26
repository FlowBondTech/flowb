/**
 * FlowB City Search — lightweight city autocomplete
 *
 * 130+ cities across 60+ countries, weighted toward crypto/tech/web3 event hubs.
 * No external API dependency — works offline in both mini apps.
 */

export interface City {
  /** Display name, e.g. "Denver" */
  name: string;
  /** ISO 3166-1 alpha-2 country code, e.g. "US" */
  country: string;
  /** Full country name, e.g. "United States" */
  countryName: string;
  /** State / province / region, e.g. "Colorado" */
  region?: string;
}

export const CITIES: City[] = [
  // ── United States ─────────────────────────────────────────────────────
  { name: "Denver", country: "US", countryName: "United States", region: "Colorado" },
  { name: "Miami", country: "US", countryName: "United States", region: "Florida" },
  { name: "Austin", country: "US", countryName: "United States", region: "Texas" },
  { name: "New York", country: "US", countryName: "United States", region: "New York" },
  { name: "San Francisco", country: "US", countryName: "United States", region: "California" },
  { name: "Los Angeles", country: "US", countryName: "United States", region: "California" },
  { name: "Chicago", country: "US", countryName: "United States", region: "Illinois" },
  { name: "Seattle", country: "US", countryName: "United States", region: "Washington" },
  { name: "Boston", country: "US", countryName: "United States", region: "Massachusetts" },
  { name: "Portland", country: "US", countryName: "United States", region: "Oregon" },
  { name: "Nashville", country: "US", countryName: "United States", region: "Tennessee" },
  { name: "Atlanta", country: "US", countryName: "United States", region: "Georgia" },
  { name: "Washington DC", country: "US", countryName: "United States", region: "District of Columbia" },
  { name: "San Diego", country: "US", countryName: "United States", region: "California" },
  { name: "Boulder", country: "US", countryName: "United States", region: "Colorado" },
  { name: "Salt Lake City", country: "US", countryName: "United States", region: "Utah" },
  { name: "Honolulu", country: "US", countryName: "United States", region: "Hawaii" },
  { name: "Dallas", country: "US", countryName: "United States", region: "Texas" },
  { name: "Houston", country: "US", countryName: "United States", region: "Texas" },
  { name: "Philadelphia", country: "US", countryName: "United States", region: "Pennsylvania" },
  { name: "Minneapolis", country: "US", countryName: "United States", region: "Minnesota" },

  // ── Canada ────────────────────────────────────────────────────────────
  { name: "Toronto", country: "CA", countryName: "Canada", region: "Ontario" },
  { name: "Vancouver", country: "CA", countryName: "Canada", region: "British Columbia" },
  { name: "Montreal", country: "CA", countryName: "Canada", region: "Quebec" },
  { name: "Calgary", country: "CA", countryName: "Canada", region: "Alberta" },

  // ── Mexico & Central America ──────────────────────────────────────────
  { name: "Mexico City", country: "MX", countryName: "Mexico" },
  { name: "Playa del Carmen", country: "MX", countryName: "Mexico", region: "Quintana Roo" },
  { name: "Guadalajara", country: "MX", countryName: "Mexico", region: "Jalisco" },
  { name: "Panama City", country: "PA", countryName: "Panama" },
  { name: "San Jose", country: "CR", countryName: "Costa Rica" },

  // ── South America ─────────────────────────────────────────────────────
  { name: "Buenos Aires", country: "AR", countryName: "Argentina" },
  { name: "Sao Paulo", country: "BR", countryName: "Brazil" },
  { name: "Rio de Janeiro", country: "BR", countryName: "Brazil" },
  { name: "Bogota", country: "CO", countryName: "Colombia" },
  { name: "Medellin", country: "CO", countryName: "Colombia" },
  { name: "Santiago", country: "CL", countryName: "Chile" },
  { name: "Lima", country: "PE", countryName: "Peru" },
  { name: "Montevideo", country: "UY", countryName: "Uruguay" },

  // ── United Kingdom & Ireland ──────────────────────────────────────────
  { name: "London", country: "GB", countryName: "United Kingdom", region: "England" },
  { name: "Edinburgh", country: "GB", countryName: "United Kingdom", region: "Scotland" },
  { name: "Manchester", country: "GB", countryName: "United Kingdom", region: "England" },
  { name: "Dublin", country: "IE", countryName: "Ireland" },

  // ── Western Europe ────────────────────────────────────────────────────
  { name: "Berlin", country: "DE", countryName: "Germany" },
  { name: "Munich", country: "DE", countryName: "Germany", region: "Bavaria" },
  { name: "Paris", country: "FR", countryName: "France" },
  { name: "Lisbon", country: "PT", countryName: "Portugal" },
  { name: "Porto", country: "PT", countryName: "Portugal" },
  { name: "Amsterdam", country: "NL", countryName: "Netherlands" },
  { name: "Brussels", country: "BE", countryName: "Belgium" },
  { name: "Zurich", country: "CH", countryName: "Switzerland" },
  { name: "Zug", country: "CH", countryName: "Switzerland" },
  { name: "Geneva", country: "CH", countryName: "Switzerland" },
  { name: "Vienna", country: "AT", countryName: "Austria" },
  { name: "Barcelona", country: "ES", countryName: "Spain" },
  { name: "Madrid", country: "ES", countryName: "Spain" },
  { name: "Milan", country: "IT", countryName: "Italy" },
  { name: "Rome", country: "IT", countryName: "Italy" },
  { name: "Luxembourg", country: "LU", countryName: "Luxembourg" },
  { name: "Copenhagen", country: "DK", countryName: "Denmark" },
  { name: "Stockholm", country: "SE", countryName: "Sweden" },
  { name: "Oslo", country: "NO", countryName: "Norway" },
  { name: "Helsinki", country: "FI", countryName: "Finland" },

  // ── Eastern Europe ────────────────────────────────────────────────────
  { name: "Prague", country: "CZ", countryName: "Czech Republic" },
  { name: "Warsaw", country: "PL", countryName: "Poland" },
  { name: "Krakow", country: "PL", countryName: "Poland" },
  { name: "Budapest", country: "HU", countryName: "Hungary" },
  { name: "Bucharest", country: "RO", countryName: "Romania" },
  { name: "Tallinn", country: "EE", countryName: "Estonia" },
  { name: "Riga", country: "LV", countryName: "Latvia" },
  { name: "Vilnius", country: "LT", countryName: "Lithuania" },
  { name: "Sofia", country: "BG", countryName: "Bulgaria" },
  { name: "Belgrade", country: "RS", countryName: "Serbia" },
  { name: "Zagreb", country: "HR", countryName: "Croatia" },
  { name: "Ljubljana", country: "SI", countryName: "Slovenia" },
  { name: "Kyiv", country: "UA", countryName: "Ukraine" },

  // ── Turkey & Middle East ──────────────────────────────────────────────
  { name: "Istanbul", country: "TR", countryName: "Turkey" },
  { name: "Dubai", country: "AE", countryName: "United Arab Emirates" },
  { name: "Abu Dhabi", country: "AE", countryName: "United Arab Emirates" },
  { name: "Tel Aviv", country: "IL", countryName: "Israel" },
  { name: "Riyadh", country: "SA", countryName: "Saudi Arabia" },
  { name: "Doha", country: "QA", countryName: "Qatar" },
  { name: "Bahrain", country: "BH", countryName: "Bahrain" },

  // ── Africa ────────────────────────────────────────────────────────────
  { name: "Lagos", country: "NG", countryName: "Nigeria" },
  { name: "Nairobi", country: "KE", countryName: "Kenya" },
  { name: "Cape Town", country: "ZA", countryName: "South Africa" },
  { name: "Johannesburg", country: "ZA", countryName: "South Africa" },
  { name: "Accra", country: "GH", countryName: "Ghana" },
  { name: "Kigali", country: "RW", countryName: "Rwanda" },
  { name: "Cairo", country: "EG", countryName: "Egypt" },
  { name: "Casablanca", country: "MA", countryName: "Morocco" },
  { name: "Dar es Salaam", country: "TZ", countryName: "Tanzania" },
  { name: "Addis Ababa", country: "ET", countryName: "Ethiopia" },

  // ── South & Central Asia ──────────────────────────────────────────────
  { name: "Bangalore", country: "IN", countryName: "India", region: "Karnataka" },
  { name: "Mumbai", country: "IN", countryName: "India", region: "Maharashtra" },
  { name: "New Delhi", country: "IN", countryName: "India" },
  { name: "Hyderabad", country: "IN", countryName: "India", region: "Telangana" },

  // ── Southeast Asia ────────────────────────────────────────────────────
  { name: "Singapore", country: "SG", countryName: "Singapore" },
  { name: "Bangkok", country: "TH", countryName: "Thailand" },
  { name: "Chiang Mai", country: "TH", countryName: "Thailand" },
  { name: "Ho Chi Minh City", country: "VN", countryName: "Vietnam" },
  { name: "Hanoi", country: "VN", countryName: "Vietnam" },
  { name: "Kuala Lumpur", country: "MY", countryName: "Malaysia" },
  { name: "Jakarta", country: "ID", countryName: "Indonesia" },
  { name: "Bali", country: "ID", countryName: "Indonesia" },
  { name: "Manila", country: "PH", countryName: "Philippines" },

  // ── East Asia ─────────────────────────────────────────────────────────
  { name: "Tokyo", country: "JP", countryName: "Japan" },
  { name: "Osaka", country: "JP", countryName: "Japan" },
  { name: "Seoul", country: "KR", countryName: "South Korea" },
  { name: "Busan", country: "KR", countryName: "South Korea" },
  { name: "Hong Kong", country: "HK", countryName: "Hong Kong" },
  { name: "Taipei", country: "TW", countryName: "Taiwan" },
  { name: "Shanghai", country: "CN", countryName: "China" },
  { name: "Beijing", country: "CN", countryName: "China" },
  { name: "Shenzhen", country: "CN", countryName: "China" },

  // ── Oceania ───────────────────────────────────────────────────────────
  { name: "Sydney", country: "AU", countryName: "Australia", region: "New South Wales" },
  { name: "Melbourne", country: "AU", countryName: "Australia", region: "Victoria" },
  { name: "Brisbane", country: "AU", countryName: "Australia", region: "Queensland" },
  { name: "Auckland", country: "NZ", countryName: "New Zealand" },

  // ── Mediterranean & Islands ───────────────────────────────────────────
  { name: "Valletta", country: "MT", countryName: "Malta" },
  { name: "Nicosia", country: "CY", countryName: "Cyprus" },
  { name: "Athens", country: "GR", countryName: "Greece" },
  { name: "Tenerife", country: "ES", countryName: "Spain", region: "Canary Islands" },

  // ── Caribbean ─────────────────────────────────────────────────────────
  { name: "Nassau", country: "BS", countryName: "Bahamas" },
  { name: "San Juan", country: "PR", countryName: "Puerto Rico" },
  { name: "George Town", country: "KY", countryName: "Cayman Islands" },

  // ── Crypto-notable small jurisdictions ────────────────────────────────
  { name: "Vaduz", country: "LI", countryName: "Liechtenstein" },
  { name: "Gibraltar", country: "GI", countryName: "Gibraltar" },
  { name: "Monaco", country: "MC", countryName: "Monaco" },
];

/**
 * Case-insensitive prefix search across city name, country code, country
 * name, and region. Returns up to `limit` matching cities.
 *
 * Also matches "City, Country" patterns (e.g. "denver, us").
 *
 * Performance: linear scan is appropriate for ~130 entries.
 */
export function searchCities(query: string, limit = 10): City[] {
  if (!query || !query.trim()) {
    return [];
  }

  const q = query.trim().toLowerCase();
  const results: City[] = [];

  for (const city of CITIES) {
    if (results.length >= limit) break;

    const nameMatch = city.name.toLowerCase().startsWith(q);
    const countryCodeMatch = city.country.toLowerCase().startsWith(q);
    const countryNameMatch = city.countryName.toLowerCase().startsWith(q);
    const regionMatch = city.region
      ? city.region.toLowerCase().startsWith(q)
      : false;

    // Also match on "city, country" pattern
    const combined = `${city.name}, ${city.countryName}`.toLowerCase();
    const combinedMatch = combined.startsWith(q);

    // Substring match on name for partial typing (e.g. "ang" -> "Los Angeles", "Bangkok", "Bangalore")
    const nameContains = city.name.toLowerCase().includes(q);

    if (nameMatch || countryCodeMatch || countryNameMatch || regionMatch || combinedMatch || nameContains) {
      results.push(city);
    }
  }

  // Sort: exact prefix matches first, then substring matches
  results.sort((a, b) => {
    const aPrefix = a.name.toLowerCase().startsWith(q) ? 0 : 1;
    const bPrefix = b.name.toLowerCase().startsWith(q) ? 0 : 1;
    return aPrefix - bPrefix;
  });

  return results.slice(0, limit);
}
