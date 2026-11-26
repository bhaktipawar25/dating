export type DocumentTypeId =
  | "PASSPORT"
  | "NATIONAL_ID"
  | "DRIVERS_LICENSE"
  | "AADHAAR"
  | "PAN";

export interface CountryOption {
  code: string;
  name: string;
}

export interface DocumentTypeConfig {
  id: DocumentTypeId;
  label: string;
  description: string;
  requiresBackSide: boolean;
  /** When defined, this document type is only shown for the listed country codes. */
  countryCodes?: readonly string[];
}

export const DOCUMENT_TYPES: readonly DocumentTypeConfig[] = [
  {
    id: "PASSPORT",
    label: "Passport",
    description: "Photo page of your valid international passport.",
    requiresBackSide: false,
  },
  {
    id: "NATIONAL_ID",
    label: "National ID",
    description: "Government-issued national identity card (front and back).",
    requiresBackSide: true,
  },
  {
    id: "DRIVERS_LICENSE",
    label: "Driver's License",
    description: "Valid driving license showing photo and details (front and back).",
    requiresBackSide: true,
  },
  {
    id: "AADHAAR",
    label: "Aadhaar",
    description: "Indian Aadhaar card issued by UIDAI (front and back).",
    requiresBackSide: true,
    countryCodes: ["IN"],
  },
  {
    id: "PAN",
    label: "PAN",
    description: "Indian Permanent Account Number card (front side only).",
    requiresBackSide: false,
    countryCodes: ["IN"],
  },
] as const;

export function getDocumentTypesForCountry(
  countryCode: string
): DocumentTypeConfig[] {
  const normalized = countryCode.trim().toUpperCase();
  return DOCUMENT_TYPES.filter(
    (doc) => !doc.countryCodes || doc.countryCodes.includes(normalized)
  );
}

export const COUNTRIES: readonly CountryOption[] = [
  { code: "IN", name: "India" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "SG", name: "Singapore" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "NL", name: "Netherlands" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "IE", name: "Ireland" },
  { code: "NZ", name: "New Zealand" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "ZA", name: "South Africa" },
  { code: "MY", name: "Malaysia" },
  { code: "ID", name: "Indonesia" },
  { code: "PH", name: "Philippines" },
  { code: "TH", name: "Thailand" },
  { code: "VN", name: "Vietnam" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "BE", name: "Belgium" },
  { code: "AT", name: "Austria" },
  { code: "DK", name: "Denmark" },
  { code: "NO", name: "Norway" },
  { code: "FI", name: "Finland" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "IL", name: "Israel" },
  { code: "TR", name: "Turkey" },
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenya" },
].sort((a, b) => a.name.localeCompare(b.name));
