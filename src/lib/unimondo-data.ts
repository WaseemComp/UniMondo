import type { DestinationGuide } from "@/lib/destination-guide";

export type RegionGroup =
  | "Western Europe"
  | "Southern Europe"
  | "Northern Europe"
  | "Central/Eastern Europe";

export interface CountryDetail {
  country: string;
  /** Resolved from CMS `region_groups.label` — may include non-European regions (e.g. North America). */
  regionGroup: string;
  highlighted?: boolean;
  whyStudyThere: string;
  popularUniversities: string[];
  livingCostApprox: string;
  visaInfo: string;
  slug?: string;
  flagEmoji?: string;
  description?: string;
  /** Populated from `countries.destination_guide` when Supabase returns structured overrides. */
  destinationGuide?: DestinationGuide;
}

export interface Opening {
  id: string;
  continent: string;
  country: string;
  region: string;
  intake: string;
  university: string;
  logoText: string;
  programName: string;
  deadline: string;
  tuitionRange: string;
  logoUrl?: string | null;
  description?: string;
  /** From CMS `programs.degree` when available. */
  degreeLevel?: string;
  /** Display hint when known (often English-taught for EU listings). */
  languageOfInstruction?: string;
}

export const countryDetails: CountryDetail[] = [
  {
    country: "Italy",
    regionGroup: "Southern Europe",
    highlighted: true,
    whyStudyThere:
      "Top-ranked public universities, affordable tuition options, and strong scholarship pathways for international students.",
    popularUniversities: ["University of Bologna", "Sapienza University of Rome", "Politecnico di Milano"],
    livingCostApprox: "EUR 700 - 1,200/month",
    visaInfo: "Type D student visa, proof of admission, funds, insurance, and accommodation required.",
  },
  {
    country: "Germany",
    regionGroup: "Central/Eastern Europe",
    whyStudyThere: "Globally respected research ecosystem and low tuition in many public institutions.",
    popularUniversities: ["TU Munich", "Heidelberg University", "RWTH Aachen"],
    livingCostApprox: "EUR 850 - 1,300/month",
    visaInfo: "National visa with blocked account, admission letter, and health insurance documentation.",
  },
  {
    country: "France",
    regionGroup: "Western Europe",
    whyStudyThere: "Prestigious universities, innovation hubs, and excellent business and arts programs.",
    popularUniversities: ["Sorbonne University", "PSL University", "Ecole Polytechnique"],
    livingCostApprox: "EUR 900 - 1,500/month",
    visaInfo: "Long-stay student visa through Campus France and proof of financial resources.",
  },
  {
    country: "Spain",
    regionGroup: "Southern Europe",
    whyStudyThere: "Diverse student life, globally recognized programs, and lower living costs than many peers.",
    popularUniversities: ["University of Barcelona", "Autonomous University of Madrid", "University of Navarra"],
    livingCostApprox: "EUR 750 - 1,200/month",
    visaInfo: "Student visa with acceptance letter, medical insurance, and proof of means.",
  },
  {
    country: "Netherlands",
    regionGroup: "Western Europe",
    whyStudyThere: "Wide availability of English-taught programs and practical career-focused education.",
    popularUniversities: ["Delft University of Technology", "University of Amsterdam", "Leiden University"],
    livingCostApprox: "EUR 1,000 - 1,600/month",
    visaInfo: "Residence permit process coordinated by host university after admission.",
  },
  {
    country: "Poland",
    regionGroup: "Central/Eastern Europe",
    whyStudyThere: "Affordable tuition and living with rapidly growing international student communities.",
    popularUniversities: ["University of Warsaw", "Jagiellonian University", "Warsaw University of Technology"],
    livingCostApprox: "EUR 500 - 900/month",
    visaInfo: "National student visa with acceptance, accommodation, and financial proof.",
  },
  {
    country: "Ireland",
    regionGroup: "Western Europe",
    whyStudyThere: "Strong links to global industries in technology, business, and life sciences.",
    popularUniversities: ["Trinity College Dublin", "University College Dublin", "University of Galway"],
    livingCostApprox: "EUR 1,100 - 1,700/month",
    visaInfo: "Long-stay D visa with admissions and financial ability evidence.",
  },
  {
    country: "Sweden",
    regionGroup: "Northern Europe",
    whyStudyThere: "Innovation-driven teaching with excellent sustainability and engineering programs.",
    popularUniversities: ["Lund University", "KTH Royal Institute of Technology", "Uppsala University"],
    livingCostApprox: "EUR 900 - 1,400/month",
    visaInfo: "Residence permit for studies with insurance and maintenance funds.",
  },
  {
    country: "Norway",
    regionGroup: "Northern Europe",
    whyStudyThere: "High-quality education and a safe, student-friendly environment.",
    popularUniversities: ["University of Oslo", "Norwegian University of Science and Technology", "University of Bergen"],
    livingCostApprox: "EUR 1,000 - 1,700/month",
    visaInfo: "Study permit with admission and proof of annual funds.",
  },
  {
    country: "Finland",
    regionGroup: "Northern Europe",
    whyStudyThere: "Excellent education standards and strong opportunities in technology and design.",
    popularUniversities: ["University of Helsinki", "Aalto University", "Tampere University"],
    livingCostApprox: "EUR 800 - 1,300/month",
    visaInfo: "Residence permit for studies and sufficient financial means.",
  },
  {
    country: "Austria",
    regionGroup: "Central/Eastern Europe",
    whyStudyThere: "Quality public universities with competitive tuition and central European access.",
    popularUniversities: ["University of Vienna", "TU Wien", "University of Innsbruck"],
    livingCostApprox: "EUR 800 - 1,300/month",
    visaInfo: "Residence permit student with admissions, accommodation, and insurance.",
  },
  {
    country: "Belgium",
    regionGroup: "Western Europe",
    whyStudyThere: "Multilingual culture and excellent programs in policy, business, and engineering.",
    popularUniversities: ["KU Leuven", "Ghent University", "UCLouvain"],
    livingCostApprox: "EUR 850 - 1,400/month",
    visaInfo: "Long-stay visa and residence registration after arrival.",
  },
  {
    country: "Denmark",
    regionGroup: "Northern Europe",
    whyStudyThere: "Project-based learning style and strong employment outcomes for graduates.",
    popularUniversities: ["University of Copenhagen", "Aarhus University", "Technical University of Denmark"],
    livingCostApprox: "EUR 1,100 - 1,800/month",
    visaInfo: "Residence permit for higher education with funding documentation.",
  },
  {
    country: "Hungary",
    regionGroup: "Central/Eastern Europe",
    whyStudyThere:
      "Strong STEM and medicine tracks, lively student cities, and competitive tuition with growing English-taught offerings.",
    popularUniversities: [
      "Eötvös Loránd University",
      "Budapest University of Technology and Economics",
      "Corvinus University of Budapest",
    ],
    livingCostApprox: "EUR 550 - 950/month",
    visaInfo:
      "National Type D student residence permit: admission letter, proof of funds, health insurance, and accommodation details.",
  },
];

/** Preferred ordering for regions on `/destinations` when those regions appear in data. Extra CMS regions append after these. */
export const regionGroups: RegionGroup[] = [
  "Western Europe",
  "Southern Europe",
  "Northern Europe",
  "Central/Eastern Europe",
];

export const openings: Opening[] = [
  {
    id: "it-bologna-data-fall-2026",
    continent: "Europe",
    country: "Italy",
    region: "Southern Europe",
    intake: "Fall 2026",
    university: "University of Bologna",
    logoText: "UB",
    programName: "MSc Data Science",
    deadline: "2026-05-30",
    tuitionRange: "EUR 2,500 - 4,200",
  },
  {
    id: "it-polimi-design-spring-2027",
    continent: "Europe",
    country: "Italy",
    region: "Southern Europe",
    intake: "Spring 2027",
    university: "Politecnico di Milano",
    logoText: "PM",
    programName: "MSc Design for Digital Futures",
    deadline: "2026-11-10",
    tuitionRange: "EUR 3,900 - 6,200",
  },
  {
    id: "de-tum-ai-fall-2026",
    continent: "Europe",
    country: "Germany",
    region: "Central/Eastern Europe",
    intake: "Fall 2026",
    university: "TU Munich",
    logoText: "TM",
    programName: "MSc Artificial Intelligence",
    deadline: "2026-06-20",
    tuitionRange: "EUR 0 - 3,500",
  },
  {
    id: "fr-sorbonne-law-spring-2027",
    continent: "Europe",
    country: "France",
    region: "Western Europe",
    intake: "Spring 2027",
    university: "Sorbonne University",
    logoText: "SU",
    programName: "LLM International Business Law",
    deadline: "2026-10-25",
    tuitionRange: "EUR 4,000 - 7,800",
  },
  {
    id: "es-barcelona-marketing-fall-2026",
    continent: "Europe",
    country: "Spain",
    region: "Southern Europe",
    intake: "Fall 2026",
    university: "University of Barcelona",
    logoText: "UB",
    programName: "MSc Digital Marketing",
    deadline: "2026-07-15",
    tuitionRange: "EUR 3,200 - 5,400",
  },
  {
    id: "nl-amsterdam-finance-spring-2027",
    continent: "Europe",
    country: "Netherlands",
    region: "Western Europe",
    intake: "Spring 2027",
    university: "University of Amsterdam",
    logoText: "UA",
    programName: "MSc Quantitative Finance",
    deadline: "2026-11-22",
    tuitionRange: "EUR 8,500 - 13,500",
  },
  {
    id: "pl-warsaw-cs-fall-2026",
    continent: "Europe",
    country: "Poland",
    region: "Central/Eastern Europe",
    intake: "Fall 2026",
    university: "University of Warsaw",
    logoText: "UW",
    programName: "MSc Computer Science",
    deadline: "2026-06-01",
    tuitionRange: "EUR 2,000 - 4,000",
  },
  {
    id: "ie-trinity-biotech-fall-2026",
    continent: "Europe",
    country: "Ireland",
    region: "Western Europe",
    intake: "Fall 2026",
    university: "Trinity College Dublin",
    logoText: "TD",
    programName: "MSc Biotechnology",
    deadline: "2026-07-01",
    tuitionRange: "EUR 9,500 - 15,000",
  },
  {
    id: "se-lund-energy-spring-2027",
    continent: "Europe",
    country: "Sweden",
    region: "Northern Europe",
    intake: "Spring 2027",
    university: "Lund University",
    logoText: "LU",
    programName: "MSc Sustainable Energy",
    deadline: "2026-10-30",
    tuitionRange: "EUR 10,000 - 14,200",
  },
  {
    id: "dk-copenhagen-it-fall-2026",
    continent: "Europe",
    country: "Denmark",
    region: "Northern Europe",
    intake: "Fall 2026",
    university: "University of Copenhagen",
    logoText: "UC",
    programName: "MSc IT and Cognition",
    deadline: "2026-06-18",
    tuitionRange: "EUR 9,000 - 13,000",
  },
];
