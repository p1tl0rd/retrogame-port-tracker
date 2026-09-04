export const PROJECT_TYPES = [
  "source_port", "official_source_port", "decompilation", "decompilation_port",
  "static_recompilation", "binary_recompilation", "reimplementation",
  "engine_reimplementation", "clean_room_reimplementation", "fan_port",
  "engine_port", "compatibility_layer", "remake", "other",
] as const;

export const MATURITY_LEVELS = [
  "unknown", "research", "early", "boots", "menu", "in_game", "playable",
  "completable", "stable", "mature",
] as const;

export const ACTIVITY_LEVELS = ["very_active", "active", "slow", "dormant", "archived", "unknown"] as const;
export const SUPPORT_STATES = ["supported", "partial", "unsupported", "unknown"] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];
export type Maturity = (typeof MATURITY_LEVELS)[number];
export type Activity = (typeof ACTIVITY_LEVELS)[number];
export type SupportState = (typeof SUPPORT_STATES)[number];

export interface Evidence {
  source_type: "official_project" | "official_readme" | "release_notes" | "project_website" | "maintainer_statement" | "issue" | "pull_request" | "manual_verification" | "other";
  url: string;
  checked_at: string;
}

export interface Game {
  id: string;
  title: string;
  aliases?: string[];
  release: { year: number };
  original_platforms: string[];
  developers?: string[];
  publishers?: string[];
  genres?: string[];
  projects: string[];
  tags?: string[];
}

export interface Platform {
  id: string;
  name: string;
  kind: "console" | "computer" | "mobile" | "other";
  manufacturer?: string;
  released?: number;
}

export interface Project {
  id: string;
  name: string;
  summary?: string;
  games: string[];
  project_type: ProjectType;
  upstream: { github?: string; website?: string | null };
  repositories?: { role: string; github: string }[];
  modern_platforms: Record<string, SupportState>;
  status: { maturity: Maturity; activity_override?: Activity | null; verified?: boolean };
  requirements: Record<string, boolean | "unknown">;
  features?: Record<string, SupportState>;
  tracking?: { github_metadata?: boolean; progress_adapter?: string };
  evidence?: Record<string, Evidence>;
  events?: CatalogueEvent[];
}

export interface CatalogueEvent {
  date: string;
  type: "project_added" | "release" | "maturity_change" | "platform_support_added" | "major_feature" | "progress_change";
  title: string;
  url?: string;
}

export interface Catalogue {
  games: Game[];
  projects: Project[];
  platforms: Platform[];
  gameById: Map<string, Game>;
  projectById: Map<string, Project>;
  platformById: Map<string, Platform>;
}
