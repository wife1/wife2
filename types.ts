export interface Character {
  id: string;
  name: string;
  age: number;
  gender: string;
  relationshipType: string;
  appearance: {
    hairColor: string;
    eyeColor: string;
    clothingStyle: string;
    physique: string;
    style: 'Anime' | 'Realistic' | 'Oil Painting' | 'Cyberpunk';
  };
  personality: {
    traits: string[];
    bio: string;
  };
  avatarUrl?: string;
  createdAt: number;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface ChatSession {
  characterId: string;
  messages: Message[];
}

export enum AppView {
  LANDING = 'LANDING',
  CREATOR = 'CREATOR',
  CHAT = 'CHAT',
}