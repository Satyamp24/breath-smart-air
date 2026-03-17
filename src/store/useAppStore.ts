import { create } from 'zustand';

export interface AqiData {
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  station: string;
  time: string;
}

export interface RouteData {
  id: string;
  coordinates: [number, number][];
  distance: number; // km
  duration: number; // minutes
  avgAqi: number;
  maxAqi: number;
  exposureScore: number;
  color: string;
}

export interface UserProfile {
  name: string;
  age: number | null;
  city: string;
  has_asthma: boolean;
  has_allergies: boolean;
  has_breathing_issues: boolean;
}

interface AppState {
  // AQI
  currentAqi: AqiData | null;
  setCurrentAqi: (aqi: AqiData | null) => void;
  selectedLocation: { lat: number; lng: number } | null;
  setSelectedLocation: (loc: { lat: number; lng: number } | null) => void;

  // Map
  mapCenter: [number, number];
  setMapCenter: (center: [number, number]) => void;
  mapZoom: number;
  setMapZoom: (zoom: number) => void;
  mapMarkers: Array<{ lat: number; lng: number; aqi: number }>;
  addMapMarker: (marker: { lat: number; lng: number; aqi: number }) => void;
  clearMarkers: () => void;

  // Routes
  routes: RouteData[];
  setRoutes: (routes: RouteData[]) => void;
  selectedRouteId: string | null;
  setSelectedRouteId: (id: string | null) => void;

  // Profile
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;

  // Insights
  insights: string[];
  setInsights: (insights: string[]) => void;

  // Loading
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentAqi: null,
  setCurrentAqi: (aqi) => set({ currentAqi: aqi }),
  selectedLocation: null,
  setSelectedLocation: (loc) => set({ selectedLocation: loc }),

  mapCenter: [28.6139, 77.209],
  setMapCenter: (center) => set({ mapCenter: center }),
  mapZoom: 12,
  setMapZoom: (zoom) => set({ mapZoom: zoom }),
  mapMarkers: [],
  addMapMarker: (marker) =>
    set((state) => ({ mapMarkers: [...state.mapMarkers, marker] })),
  clearMarkers: () => set({ mapMarkers: [] }),

  routes: [],
  setRoutes: (routes) => set({ routes }),
  selectedRouteId: null,
  setSelectedRouteId: (id) => set({ selectedRouteId: id }),

  profile: {
    name: '',
    age: null,
    city: '',
    has_asthma: false,
    has_allergies: false,
    has_breathing_issues: false,
  },
  setProfile: (profile) => set({ profile }),

  insights: [],
  setInsights: (insights) => set({ insights }),

  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
}));
