import type { ThemeId } from '../themes/themes';

export interface ThemeSnapshot {
  themeId: ThemeId;
}

export type SyncMode = 'local' | 'cloud';
export type SidebarPinnedAppId =
  | 'dashboard'
  | 'focus'
  | 'missions'
  | 'roadmap'
  | 'today'
  | 'calendar'
  | 'tasks'
  | 'history'
  | 'insights'
  | 'review'
  | 'journal'
  | 'notes'
  | 'assistant'
  | 'settings';

// Kept as a plain string (not the ProviderId union from lib/ai/providers) so
// preferences stays free of a dependency on the AI layer; the settings store
// validates it against the live provider registry when read.
export type AiProviderPreference = string;

export interface SettingsSnapshot {
  reduceMotion: boolean;
  quickAddShortcut: string;
  focusPromptStyle: 'gentle' | 'direct';
  syncMode: SyncMode;
  launchAtLogin: boolean;
  sidebarPinnedApps: SidebarPinnedAppId[];
  aiProvider: AiProviderPreference;
  aiModel: string;
}

export const DEFAULT_THEME_SNAPSHOT: ThemeSnapshot = {
  themeId: 'dark-focus',
};

export const DEFAULT_SETTINGS_SNAPSHOT: SettingsSnapshot = {
  reduceMotion: false,
  quickAddShortcut: 'Ctrl+Shift+Space',
  focusPromptStyle: 'gentle',
  syncMode: 'local',
  launchAtLogin: false,
  sidebarPinnedApps: ['dashboard', 'tasks', 'missions', 'calendar', 'journal', 'notes'],
  aiProvider: '',
  aiModel: '',
};
