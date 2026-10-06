import type { TutorialSlug } from "../../config/tutorials";

export interface TutorialSource {
  label: string;
  href: string;
}

export interface TutorialStep {
  title: string;
  body: string;
  command?: string;
  sources: TutorialSource[];
}

export interface TutorialContent {
  title: string;
  description: string;
  summary: string;
  requirements: TutorialStep[];
  steps: TutorialStep[];
  performance: {
    intro: string;
    rows: { configuration: string; memory: string; time: string; evidence: string; sources: TutorialSource[] }[];
  };
  errors: TutorialStep[];
  files: TutorialStep[];
  screenshots: {
    intro: string;
    items: { src: string; alt: string; caption: string; source: TutorialSource }[];
  };
}

export interface TutorialTranslations {
  common: {
    eyebrow: string;
    home: string;
    reviewedAt: string;
    onThisPage: string;
    requirements: string;
    steps: string;
    performance: string;
    errors: string;
    files: string;
    screenshots: string;
    configuration: string;
    memory: string;
    time: string;
    evidence: string;
    source: string;
    related: string;
    homeLinksTitle: string;
    homeLinksDescription: string;
  };
  pages: Record<TutorialSlug, TutorialContent>;
}
