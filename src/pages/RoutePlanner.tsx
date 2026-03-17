import { useState, useCallback, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAppStore } from '@/store/useAppStore';
import { fetchRoute, getAqiLevel, searchCity } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Navigation, MapPin, Clock, Wind, Zap, Route as RouteIcon } from 'lucide-react';
import { toast } from 'sonner';

const RoutePlanner = () => {
  const { routes, setRoutes, selectedRouteId, setSelectedRouteId } = useAppStore();
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const polylinesRef = useRef<L.Polyline[]>([]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [28.6139, 77.209],
      zoom: 12,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OSM',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Draw routes
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear old polylines
    polylinesRef.current.forEach((p) => p.remove());
    polylinesRef.current = [];

    if (routes.length === 0) return;

    routes.forEach((route) => {
      const polyline = L.polyline(route.coordinates, {
        color: route.color,
        weight: selectedRouteId === route.id ? 6 : 3,
        opacity: selectedRouteId === route.id ? 1 : 0.4,
      }).addTo(mapRef.current!);

      polyline.on('click', () => setSelectedRouteId(route.id));
      polylinesRef.current.push(polyline);
    });

    // Fit bounds
    const allCoords = routes.flatMap((r) => r.coordinates);
    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords.map((c) => L.latLng(c[0], c[1])));
      mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [routes, selectedRouteId]);

  const planRoute = useCallback(async () => {
    if (!source.trim() || !destination.trim()) {
      toast.error('Enter both source and destination');
      return;
    }
    setLoading(true);
    toast.info('Planning routes...');

    const srcGeo = await searchCity(source);
    const destGeo = await searchCity(destination);

    if (!srcGeo || !destGeo) {
      toast.error('Could not find one or both locations');
      setLoading(false);
      return;
    }

    const routeData = await fetchRoute(srcGeo.lat, srcGeo.lng, destGeo.lat, destGeo.lng);
    if (routeData.length === 0) {
      toast.error('No routes found');
    } else {
      setRoutes(routeData);
      setSelectedRouteId(routeData[0].id);
      toast.success(`Found ${routeData.length} route(s)`);
    }
    setLoading(false);
  }, [source, destination, setRoutes, setSelectedRouteId]);

  return (
    <div className="h-screen flex flex-col pb-20">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 space-y-3">
        <h1 className="text-xl font-bold font-display gradient-text">Clean Air Route Planner</h1>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary shrink-0" />
            <Input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Source (e.g., Connaught Place)"
              className="bg-secondary border-border"
              onKeyDown={(e) => e.key === 'Enter' && planRoute()}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive shrink-0" />
            <Input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Destination (e.g., India Gate)"
              className="bg-secondary border-border"
              onKeyDown={(e) => e.key === 'Enter' && planRoute()}
            />
          </div>
          <Button onClick={planRoute} disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            {loading ? (
              <span className="animate-pulse">Calculating routes...</span>
            ) : (
              <><Navigation className="w-4 h-4 mr-2" /> Find Cleanest Route</>
            )}
          </Button>
        </div>
      </motion.div>

      {routes.length > 0 && (
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
          {routes.map((route, i) => (
            <button
              key={route.id}
              onClick={() => setSelectedRouteId(route.id)}
              className={`glass-card p-3 min-w-[160px] text-left transition-all shrink-0 ${
                selectedRouteId === route.id ? 'ring-2 ring-primary' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <RouteIcon className="w-3 h-3" style={{ color: route.color }} />
                <span className="text-xs font-semibold">Route {i + 1}</span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{route.distance} km</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{route.duration} min</span>
                </div>
                <div className="flex items-center gap-1">
                  <Wind className="w-3 h-3" />
                  <span className="font-bold" style={{ color: getAqiLevel(route.avgAqi).color }}>
                    AQI: {route.avgAqi}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  <span>Exposure: {route.exposureScore}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 relative">
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
};

export default RoutePlanner;
