import { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAppStore } from '@/store/useAppStore';
import { fetchRoute, getAqiLevel, searchCity } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Navigation, MapPin, Clock, Wind, Zap, Route as RouteIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { RouteData } from '@/store/useAppStore';

// Fix leaflet default icon
delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function FitBounds({ routes }: { routes: RouteData[] }) {
  const map = useMap();
  if (routes.length > 0) {
    const allCoords = routes.flatMap((r) => r.coordinates);
    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords.map((c) => L.latLng(c[0], c[1])));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }
  return null;
}

const RoutePlanner = () => {
  const { routes, setRoutes, selectedRouteId, setSelectedRouteId } = useAppStore();
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);

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

  const selectedRoute = routes.find((r) => r.id === selectedRouteId);

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
        <MapContainer
          center={[28.6139, 77.209]}
          zoom={12}
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; OSM'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {routes.length > 0 && <FitBounds routes={routes} />}
          {routes.map((route) => (
            <Polyline
              key={route.id}
              positions={route.coordinates}
              pathOptions={{
                color: route.color,
                weight: selectedRouteId === route.id ? 6 : 3,
                opacity: selectedRouteId === route.id ? 1 : 0.4,
              }}
              eventHandlers={{
                click: () => setSelectedRouteId(route.id),
              }}
            />
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default RoutePlanner;
