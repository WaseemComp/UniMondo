/**
 * CMS shape for `/destinations/[country]` sections A–C.
 * Stored in `countries.destination_guide`; merged with computed defaults on the public site.
 */

export type DestinationGuideOverview = {
  educationSystem?: string;
  popularCitiesLifestyle?: string;
  scholarships?: string;
};

export type DestinationGuideCosts = {
  /** Replaces the auto “tuition band from published programs” line when set */
  tuitionBandNote?: string;
  accommodation?: string;
  foodTransport?: string;
  proofOfFunds?: string;
};

export type DestinationGuideVisa = {
  studentVisaType?: string;
  mainRequirements?: string;
  proofOfAdmission?: string;
  proofOfFunds?: string;
  insurance?: string;
  accommodation?: string;
  embassyNote?: string;
};

export type DestinationGuide = {
  overview?: DestinationGuideOverview;
  costs?: DestinationGuideCosts;
  visa?: DestinationGuideVisa;
};

function trimOrUndef(s: unknown): string | undefined {
  if (typeof s !== "string") return undefined;
  const t = s.trim();
  return t.length ? t : undefined;
}

export function parseDestinationGuide(raw: unknown): DestinationGuide | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const ov = o.overview && typeof o.overview === "object" ? (o.overview as Record<string, unknown>) : {};
  const co = o.costs && typeof o.costs === "object" ? (o.costs as Record<string, unknown>) : {};
  const vi = o.visa && typeof o.visa === "object" ? (o.visa as Record<string, unknown>) : {};

  const overview: DestinationGuideOverview = {
    educationSystem: trimOrUndef(ov.educationSystem),
    popularCitiesLifestyle: trimOrUndef(ov.popularCitiesLifestyle),
    scholarships: trimOrUndef(ov.scholarships),
  };
  const costs: DestinationGuideCosts = {
    tuitionBandNote: trimOrUndef(co.tuitionBandNote),
    accommodation: trimOrUndef(co.accommodation),
    foodTransport: trimOrUndef(co.foodTransport),
    proofOfFunds: trimOrUndef(co.proofOfFunds),
  };
  const visa: DestinationGuideVisa = {
    studentVisaType: trimOrUndef(vi.studentVisaType),
    mainRequirements: trimOrUndef(vi.mainRequirements),
    proofOfAdmission: trimOrUndef(vi.proofOfAdmission),
    proofOfFunds: trimOrUndef(vi.proofOfFunds),
    insurance: trimOrUndef(vi.insurance),
    accommodation: trimOrUndef(vi.accommodation),
    embassyNote: trimOrUndef(vi.embassyNote),
  };

  const hasOverview = Object.values(overview).some(Boolean);
  const hasCosts = Object.values(costs).some(Boolean);
  const hasVisa = Object.values(visa).some(Boolean);
  if (!hasOverview && !hasCosts && !hasVisa) return undefined;

  return {
    overview: hasOverview ? overview : undefined,
    costs: hasCosts ? costs : undefined,
    visa: hasVisa ? visa : undefined,
  };
}

export function emptyDestinationGuide(): DestinationGuide {
  return {
    overview: {},
    costs: {},
    visa: {},
  };
}

/** Full shape for admin forms (empty strings round-trip). */
export function destinationGuideForForm(raw: unknown): DestinationGuide {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const ov = r.overview && typeof r.overview === "object" ? (r.overview as Record<string, unknown>) : {};
  const co = r.costs && typeof r.costs === "object" ? (r.costs as Record<string, unknown>) : {};
  const vi = r.visa && typeof r.visa === "object" ? (r.visa as Record<string, unknown>) : {};

  const s = (x: unknown) => (typeof x === "string" ? x : "");

  return {
    overview: {
      educationSystem: s(ov.educationSystem),
      popularCitiesLifestyle: s(ov.popularCitiesLifestyle),
      scholarships: s(ov.scholarships),
    },
    costs: {
      tuitionBandNote: s(co.tuitionBandNote),
      accommodation: s(co.accommodation),
      foodTransport: s(co.foodTransport),
      proofOfFunds: s(co.proofOfFunds),
    },
    visa: {
      studentVisaType: s(vi.studentVisaType),
      mainRequirements: s(vi.mainRequirements),
      proofOfAdmission: s(vi.proofOfAdmission),
      proofOfFunds: s(vi.proofOfFunds),
      insurance: s(vi.insurance),
      accommodation: s(vi.accommodation),
      embassyNote: s(vi.embassyNote),
    },
  };
}

/** Persist only non-empty strings (keeps DB rows small). */
export function compactDestinationGuide(form: DestinationGuide): DestinationGuide | undefined {
  return parseDestinationGuide(form as unknown);
}
