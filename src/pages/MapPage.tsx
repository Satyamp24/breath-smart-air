import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAppStore } from '@/store/useAppStore';
import { fetchAqiByCoords, getAqiLevel, searchCity } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

function createAqiIcon(aqi: number) {
  const level = getAqiLevel(aqi);
  return L.divIcon({
    className: 'custom-aqi-marker',
    html: `<div style="background:${level.color};color:#000;font-weight:700;font-size:11px;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.3);box-shadow:0 2px 8px rgba(0,0,0,0.4)">${aqi}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

const MapPage = () => {
  const { mapCenter, mapZoom, mapMarkers, addMapMarker, setMapCenter, setMapZoom, currentAqi, setCurrentAqi, setSelectedLocation } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const heatLayerRef = useRef<L.Layer | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: mapCenter,
      zoom: mapZoom,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);

    map.on('click', async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setSelectedLocation({ lat, lng });
      toast.info('Fetching AQI...');
      const aqi = await fetchAqiByCoords(lat, lng);
      addMapMarker({ lat, lng, aqi: aqi.aqi });
      setCurrentAqi(aqi);
      toast.success(`AQI: ${aqi.aqi} (${getAqiLevel(aqi.aqi).label})`);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers
  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    mapMarkers.forEach((m) => {
      const marker = L.marker([m.lat, m.lng], { icon: createAqiIcon(m.aqi) });
      marker.bindPopup(`<div style="text-align:center"><b>AQI: ${m.aqi}</b><br/>${getAqiLevel(m.aqi).label}</div>`);
      markersLayerRef.current!.addLayer(marker);
    });

    // Heatmap
    if (mapMarkers.length >= 2 && mapRef.current) {
      import('leaflet.heat').then(() => {
        if (heatLayerRef.current && mapRef.current) {
          mapRef.current.removeLayer(heatLayerRef.current);
        }
        const points: [number, number, number][] = mapMarkers.map((m) => [m.lat, m.lng, m.aqi / 500]);
        heatLayerRef.current = (L as any).heatLayer(points, {
          radius: 25,
          blur: 20,
          maxZoom: 17,
          gradient: { 0.2: '#00e676', 0.5: '#ffab00', 0.8: '#ff1744', 1: '#880e4f' },
        }).addTo(mapRef.current!);
      });
    }
  }, [mapMarkers]);

  // Update center
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(mapCenter, mapZoom);
    }
  }, [mapCenter, mapZoom]);

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
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
};

export default MapPage;
