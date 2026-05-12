/** Single-language (English) UI copy — replaces former next-intl message files. */

export const siteNav = {
  home: "Home",
  destinations: "Destinations",
  languageCourses: "Language Courses",
  packages: "Our Packages",
  about: "About",
  contact: "Contact",
  blog: "Blog",
  freeEligibilityCheck: "Free Eligibility Check",
  startApplication: "Start Application",
} as const;

export type CoursesPageCopy = {
  kicker: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCta: string;
  cards: {
    ielts: {
      title: string;
      description: string;
      highlights: [string, string, string, string];
      button: string;
    };
    german: {
      title: string;
      description: string;
      highlights: [string, string, string, string];
      button: string;
    };
    italianFrench: {
      title: string;
      description: string;
      highlights: [string, string, string, string];
      button: string;
    };
  };
  whyTitle: string;
  whyText: string;
  whyPoints: [string, string, string, string, string];
  howTitle: string;
  howIntro: string;
  howSteps: [string, string, string, string];
  finalTitle: string;
  finalText: string;
  finalCta: string;
  businessLine: string;
};

export const coursesPageCopy: CoursesPageCopy = {
  kicker: "Courses",
  heroTitle: "Master the Language. Unlock Your Future.",
  heroSubtitle:
    "Whether you're preparing for university admission or building a global career, UniMondo offers professional language courses taught by native speakers and certified experts.",
  heroCta: "Start Your Language Journey",
  cards: {
    ielts: {
      title: "IELTS & TOEFL Preparation",
      description:
        "Achieve your target score with expert guidance. Our structured preparation programs focus on all four modules — Listening, Reading, Writing, and Speaking — with real exam strategies and mock testing.",
      highlights: ["Exam-focused training", "Certified instructors", "Real test simulations", "Personalized feedback"],
      button: "Apply for IELTS / TOEFL",
    },
    german: {
      title: "German Language (A1–C1)",
      description:
        "Learn German from native speakers and qualified trainers. Whether you're preparing for studies in Germany or career opportunities, we guide you from beginner to advanced levels.",
      highlights: [
        "Native German-speaking instructors",
        "Goethe-standard curriculum",
        "Flexible learning pace",
        "Study & visa guidance support",
      ],
      button: "Start Learning German",
    },
    italianFrench: {
      title: "Italian & French Language Courses",
      description:
        "Prepare for studying or living in Europe with our Italian and French language programs. Designed for real-life communication and academic readiness.",
      highlights: [
        "Native instructors",
        "Practical communication focus",
        "Cultural integration guidance",
        "Ideal for university preparation",
      ],
      button: "Explore Language Options",
    },
  },
  whyTitle: "Why Learn With UniMondo?",
  whyText: "At UniMondo, we don’t just teach languages — we prepare you for real success abroad.",
  whyPoints: [
    "Native-speaking instructors with international experience",
    "Goal-oriented training for exams, university, and career",
    "Structured curriculum aligned with global standards",
    "Personalized mentorship and support",
    "Direct pathway to study abroad opportunities",
  ],
  howTitle: "Your Journey Starts Here",
  howIntro: "",
  howSteps: [
    "Choose your course",
    "Submit a quick application",
    "Get a personalized study plan",
    "Start your classes with expert instructors",
  ],
  finalTitle: "Ready to Begin?",
  finalText: "Take the first step toward your international future today.",
  finalCta: "Apply Now",
  businessLine: "Successful students may also receive guidance for university admission in Europe.",
};
