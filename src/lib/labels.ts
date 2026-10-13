import type { FeatureCategory, FeatureParty, ObservationStatus } from "../schema";

export const STATUS_META: Record<ObservationStatus, { glyph: string; label: string }> = {
  supported: { glyph: "✓", label: "Supported" },
  partial: { glyph: "◐", label: "Partial" },
  unsupported: { glyph: "✕", label: "Unsupported" },
  unknown: { glyph: "?", label: "Unknown" },
  "not-applicable": { glyph: "–", label: "Not applicable" },
};

export const STATUS_ORDER: ObservationStatus[] = [
  "supported",
  "partial",
  "unsupported",
  "unknown",
  "not-applicable",
];

export const CATEGORY_LABEL: Record<FeatureCategory, string> = {
  discovery: "Discovery",
  registration: "Registration",
  authorization: "Authorization",
  token: "Tokens",
  session: "Session",
  transport: "Transport",
  delegation: "Delegation",
  consent: "Consent",
};

export const PARTY_LABEL: Record<FeatureParty, string> = {
  "mcp-server": "MCP server",
  "authorization-server": "Authorization server",
  client: "Client",
};

export const PARTY_SHORT: Record<FeatureParty, string> = {
  "mcp-server": "RS",
  "authorization-server": "AS",
  client: "C",
};

export const METHOD_LABEL = {
  manual: "Manual check",
  "vendor-claim": "Vendor claim",
  "passive-scan": "Passive scan",
  "active-scan": "Active scan",
} as const;
