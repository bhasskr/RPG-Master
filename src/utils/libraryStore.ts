import { FoundationDetails, ScenarioOption } from '../services/api';

export interface LibraryScenario {
  id: string;
  title: string;
  premise: string;
  description: string;
  campaignFormat: 'sandbox' | 'focused';
  worldBasis: 'real_world' | 'fictional';
  genre: string;
  foundation?: FoundationDetails;
  createdAt: number;
  favorite?: boolean;
  tropes?: string[];
}

const LIBRARY_KEY = 'sandbox_rpg_scenario_library';

export const getLibraryScenarios = (): LibraryScenario[] => {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
};

export const saveToLibrary = (scenario: Omit<LibraryScenario, 'id' | 'createdAt'>): void => {
  const scenarios = getLibraryScenarios();
  scenarios.push({
    ...scenario,
    id: `lib_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    createdAt: Date.now()
  });
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(scenarios));
};

export const toggleLibraryFavorite = (id: string): void => {
  const scenarios = getLibraryScenarios();
  const index = scenarios.findIndex(s => s.id === id);
  if (index !== -1) {
    scenarios[index].favorite = !scenarios[index].favorite;
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(scenarios));
  }
};

export const deleteLibraryScenario = (id: string): void => {
  const scenarios = getLibraryScenarios();
  const newScenarios = scenarios.filter(s => s.id !== id);
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(newScenarios));
};

export const updateLibraryScenarioTropes = (id: string, tropes: string[]): void => {
  const scenarios = getLibraryScenarios();
  const index = scenarios.findIndex(s => s.id === id);
  if (index !== -1) {
    scenarios[index].tropes = tropes;
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(scenarios));
  }
};
