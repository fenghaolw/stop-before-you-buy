export interface Game {
  id: string;
  title: string;
  platform: Platform;
}

export type Platform = 'steam' | 'epic' | 'gog';

export interface Library {
  steam: Game[];
  epic: Game[];
  gog: Game[];
}

export interface Settings {
  enableNotifications: boolean;
  autoSync: boolean;
}

export interface StoreConfig {
  titleSelector: string | string[];
  priceSelector: string;
  buyButtonSelector: string;
}

export interface StoreConfigs {
  [key: string]: StoreConfig;
}

export interface Message {
  action: 'fetchLibrary' | 'checkGameOwnership' | 'updateCurrentGame' | 'getCurrentGame';
  platform?: Platform;
  gameTitle?: string;
}

export interface MessageResponse {
  success: boolean;
  error?: string;
  libraries?: Library;
  owned?: boolean;
}
