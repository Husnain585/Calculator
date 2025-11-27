// src/store/global.ts
import { create } from 'zustand';

interface Settings {
  aiSuggestions: boolean;
  defaultPrecision: number;
}

interface GlobalState {
  settings: Settings;
  categories: string[];
  addCategory: (c: string) => void;
  removeCategory: (c: string) => void;
  toggleAISuggestions: () => void;
  setPrecision: (n: number) => void;
  // Persistence methods
  hydrateFromFirestore: (data: any) => void;
  getStateForPersistence: () => { settings: Settings; categories: string[] };
}

export const useGlobalStore = create<GlobalState>((set, get) => ({
  settings: { aiSuggestions: false, defaultPrecision: 2 },
  categories: [],
  
  addCategory: (c) => 
    set((s) => ({ 
      categories: Array.from(new Set([...s.categories, c.trim()])) 
    })),
    
  removeCategory: (c) => 
    set((s) => ({ 
      categories: s.categories.filter(x => x !== c) 
    })),
    
  toggleAISuggestions: () => 
    set((s) => ({ 
      settings: { ...s.settings, aiSuggestions: !s.settings.aiSuggestions } 
    })),
    
  setPrecision: (n) => 
    set((s) => ({ 
      settings: { ...s.settings, defaultPrecision: Math.max(0, n) } 
    })),
    
  // Hydrate store from Firestore data
  hydrateFromFirestore: (data: any) => {
    if (!data) return;
    
    set({
      categories: data.categories || [],
      settings: data.settings || { aiSuggestions: false, defaultPrecision: 2 }
    });
  },
  
  // Get current state for persistence
  getStateForPersistence: () => {
    const state = get();
    return {
      categories: state.categories,
      settings: state.settings
    };
  }
}));