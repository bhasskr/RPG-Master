/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ThemePreference = 'dark' | 'system';
export type TextSizePreference = 'small' | 'default' | 'large';
export type DensityPreference = 'compact' | 'comfortable';

export interface UiPreferences {
  theme: ThemePreference;
  textSize: TextSizePreference;
  density: DensityPreference;
  enableAnimations: boolean;
  showRollIndicators: boolean;
}

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  theme: 'dark',
  textSize: 'default',
  density: 'comfortable',
  enableAnimations: true,
  showRollIndicators: true,
};

const STORAGE_KEY = 'rpg_ui_preferences_v1';

export function loadUiPreferences(): UiPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_UI_PREFERENCES;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_UI_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      theme: parsed.theme === 'system' ? 'system' : 'dark',
      textSize: ['small', 'default', 'large'].includes(parsed.textSize) ? parsed.textSize : 'default',
      density: ['compact', 'comfortable'].includes(parsed.density) ? parsed.density : 'comfortable',
      enableAnimations: typeof parsed.enableAnimations === 'boolean' ? parsed.enableAnimations : true,
      showRollIndicators: typeof parsed.showRollIndicators === 'boolean' ? parsed.showRollIndicators : true,
    };
  } catch {
    return DEFAULT_UI_PREFERENCES;
  }
}

export function saveUiPreferences(prefs: UiPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (err) {
    console.warn('[UiPreferences] Falha ao salvar preferências no localStorage:', err);
  }
}
