import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAppStore } from '@/store/useAppStore';
import { fetchAqiByCoords, getAqiLevel } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Crosshair } from 'lucide-react';
import { searchCity } from '@/lib/api';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// Fix leaflet default icon
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function createAqiIcon(aqi: number) {
  const level = getAqiLevel(aqi);
  return L.divIcon({
    className: 'custom-aqi-marker',
    html: `<div style="background:${level.color};color:#000;font-weight:700;font-size:11px;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.3);box-shadow:0 2px 8px rgba(0,0,0,0.4)">${aqi}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function MapClickHandler() {
  const { addMapMarker, setCurrentAqi, setSelectedLocation } = useAppStore();

  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      setSelectedLocation({ lat, lng });
      toast.info('Fetching AQI...');
      const aqi = await fetchAqiByCoords(lat, lng);
      addMapMarker({ lat, lng, aqi: aqi.aqi });
      setCurrentAqi(aqi);
      toast.success(`AQI: ${aqi.aqi} (${getAqiLevel(aqi.aqi).label})`);
    },
  });
  return null;
}

function HeatmapLayer() {
  const map = useMap();
  const { mapMarkers } = useAppStore();
  const layerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (mapMarkers.length < 2) return;

    import('leaflet.heat').then(() => {
      if (layerRef.current) map.removeLayer(layerRef.current);
      const points: [number, number, number][] = mapMarkers.map((m) => [m.lat, m.lng, m.aqi / 500]);
      layerRef.current = (L as unknown as { heatLayer: typeof L.heatLayer }).heatLayer(points, {
        radius: 25,
        blur: 20,
        maxZoom: 17,
        gradient: { 0.2: '#00e676', 0.5: '#ffab00', 0.8: '#ff1744', 1: '#880e4f' },
      }).addTo(map);
    });

    return () => {
      if (layerRef.current) map.removeLayer(layerRef.current);
    };
  }, [mapMarkers, map]);

  return null;
}

function MapCenterUpdater() {
  const map = useMap();
  const { mapCenter, mapZoom } = useAppStore();
  useEffect(() => {
    map.setView(mapCenter, mapZoom);
  }, [mapCenter, mapZoom, map]);
  return null;
}

const MapPage = () => {
  const { mapCenter, mapZoom, mapMarkers, setMapCenter, setMapZoom, currentAqi } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const result = await searchCity(searchQuery);
    if (result) {
      setMapCenter([result.lat, result.lng]);
      setMapZoom(13);
      toast.success(`Found: ${result.name.split(',')[0]}`);
    } else {
      toast.error('Location not found');
    }
    setSearching(false);
  }, [searchQuery, setMapCenter, setMapZoom]);

  return (
    <div className="h-screen flex flex-col pb-20">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 space-y-3">
        <h1 className="text-xl font-bold font-display gradient-text">Pollution Map</h1>
        <div className="flex gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search city in India..."
            className="bg-secondary border-border"
          />
          <Button onClick={handleSearch} disabled={searching} size="icon" className="bg-primary text-primary-foreground shrink-0">
            <Search className="w-4 h-4" />
          </Button>
        </div>
        {currentAqi && (
          <div className="glass-card p-3 flex items-center justify-between">
            <div>
              <span className="text-sm text-muted-foreground">Current AQI</span>
              <p className="text-2xl font-bold font-display" style={{ color: getAqiLevel(currentAqi.aqi).color }}>
                {currentAqi.aqi}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{currentAqi.station}</p>
              <p className="text-xs text-muted-foreground">Tap map for readings</p>
            </div>
          </div>
        )}
      </motion.div>

      <div className="flex-1 relative">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <MapClickHandler />
          <HeatmapLayer />
          <MapCenterUpdater />
          {mapMarkers.map((m, i) => (
            <Marker key={i} position={[m.lat, m.lng]} icon={createAqiIcon(m.aqi)}>
              <Popup>
                <div className="text-center">
                  <p className="font-bold">AQI: {m.aqi}</p>
                  <p className="text-xs">{getAqiLevel(m.aqi).label}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapPage;
