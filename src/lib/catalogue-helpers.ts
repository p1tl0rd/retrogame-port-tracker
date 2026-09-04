import { ACTIVITY_LEVELS, MATURITY_LEVELS, PROJECT_TYPES, type Activity, type Catalogue, type CatalogueEvent, type Game, type Maturity, type Project, type ProjectType } from "../types/catalogue";

const labels = new Map<string, string>([
  ["source_port", "Source port"], ["official_source_port", "Official source port"], ["decompilation", "Decompilation"],
  ["decompilation_port", "Decompilation port"], ["static_recompilation", "Static recompilation"], ["binary_recompilation", "Binary recompilation"],
  ["reimplementation", "Reimplementation"], ["engine_reimplementation", "Engine reimplementation"],
  ["clean_room_reimplementation", "Clean-room reimplementation"], ["fan_port", "Fan port"], ["engine_port", "Engine port"],
  ["compatibility_layer", "Compatibility layer"], ["remake", "Remake"], ["other", "Other"],
  ["unknown", "Unknown"], ["research", "Research"], ["early", "Early"], ["boots", "Boots"], ["menu", "Menu"],
  ["in_game", "In-game"], ["playable", "Playable"], ["completable", "Completable"], ["stable", "Stable"], ["mature", "Mature"],
  ["very_active", "Very active"], ["active", "Active"], ["slow", "Slow"], ["dormant", "Dormant"], ["archived", "Archived"],
  ["no_stable_release", "No stable release"], ["pre_1_0", "Stable release below 1.0"],
  ["version_1_or_newer", "Stable release 1.0+"], ["unclassified", "Stable release with non-numeric tag"],
]);

export function label(value: string): string {
  return labels.get(value) ?? value.replaceAll("_", " ");
}

export function basePath(path = ""): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}

export function activityFor(project: Project): Activity {
  return project.status.activity_override ?? "unknown";
}

export function isAtLeastPlayable(maturity: Maturity): boolean {
  return MATURITY_LEVELS.indexOf(maturity) >= MATURITY_LEVELS.indexOf("playable");
}

export function projectsForGame(catalogue: Catalogue, game: Game): Project[] {
  return game.projects.map((projectId) => catalogue.projectById.get(projectId)).filter((project): project is Project => Boolean(project));
}

export function gamesForProject(catalogue: Catalogue, project: Project): Game[] {
  return project.games.map((gameId) => catalogue.gameById.get(gameId)).filter((game): game is Game => Boolean(game));
}

export interface TimelineItem extends CatalogueEvent {
  project: Project;
}

export function timeline(catalogue: Catalogue): TimelineItem[] {
  return catalogue.projects.flatMap((project) => (project.events ?? []).map((event) => ({ ...event, project })))
    .sort((left, right) => right.date.localeCompare(left.date));
}

export interface ProjectFilter {
  query?: string;
  originalPlatform?: string;
  projectType?: ProjectType;
  targetPlatform?: string;
  maturity?: Maturity;
  activity?: Activity;
}

export function filterProjects(catalogue: Catalogue, filter: ProjectFilter = {}): Project[] {
  const query = filter.query?.trim().toLocaleLowerCase();
  return catalogue.projects.filter((project) => {
    const games = gamesForProject(catalogue, project);
    const haystack = [project.name, project.id, project.summary ?? "", ...games.flatMap((game) => [game.title, ...(game.aliases ?? [])])].join(" ").toLocaleLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (filter.originalPlatform && !games.some((game) => game.original_platforms.includes(filter.originalPlatform!))) return false;
    if (filter.projectType && project.project_type !== filter.projectType) return false;
    if (filter.targetPlatform && !["supported", "partial"].includes(project.modern_platforms[filter.targetPlatform] ?? "unknown")) return false;
    if (filter.maturity && project.status.maturity !== filter.maturity) return false;
    if (filter.activity && activityFor(project) !== filter.activity) return false;
    return true;
  });
}

export function catalogueStats(catalogue: Catalogue) {
  const playable = catalogue.projects.filter((project) => isAtLeastPlayable(project.status.maturity));
  return {
    games: catalogue.games.length,
    projects: catalogue.projects.length,
    playable: playable.length,
    nativeLinux: playable.filter((project) => ["supported", "partial"].includes(project.modern_platforms.linux ?? "unknown")).length,
    active: catalogue.projects.filter((project) => ["very_active", "active"].includes(activityFor(project))).length,
  };
}

export { ACTIVITY_LEVELS, MATURITY_LEVELS, PROJECT_TYPES };
