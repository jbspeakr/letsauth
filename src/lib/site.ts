/**
 * Facts about who runs the site, used by the imprint, the privacy note and the footer.
 * One place, so the legal pages cannot drift apart.
 */
export const LAB = "Let's Auth Labs";

export const OPERATOR = {
  name: "Jan Brennenstuhl",
  street: "Rigaer Straße 18D",
  postcode: "10247",
  city: "Berlin",
  country: "Germany",
  email: "7f7d69fc85e6@brnnnsthl.eu",
  site: "https://www.janbrennenstuhl.eu/",
} as const;

export const REPO = "https://github.com/jbspeakr/letsauth";

/** The pages every page links to from the footer, in the order they appear there. */
export const LEGAL_LINKS = [
  { href: "/imprint/", label: "Imprint" },
  { href: "/privacy/", label: "Privacy" },
  { href: "/disclaimer/", label: "Disclaimer" },
  { href: "/accessibility/", label: "Accessibility" },
] as const;
