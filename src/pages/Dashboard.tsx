import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Wind, Droplets, Cloud, AlertTriangle, MapPin, RefreshCw } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { fetchAqiByCoords, getAqiLevel, getHealthRisk, generateInsights } from '@/lib/api';
import { Button } from '@/components/ui/button';
import AqiGauge from '@/components/AqiGauge';
import InsightCard from '@/components/InsightCard';

const Dashboard = () => {
  const { currentAqi, setCurrentAqi, profile, setInsights, insights } = useAppStore();
  const [loading, setLoading] = useState(false);

  const loadAqi = async () => {
    setLoading(true);
    try {
      // Default to Delhi or user's city coordinates
      let lat = 28.6139, lng = 77.209;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          );
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // fallback to Delhi
        }
      }
      const aqi = await fetchAqiByCoords(lat, lng);
      setCurrentAqi(aqi);
      const newInsights = generateInsights(aqi.aqi, profile);
      setInsights(newInsights);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentAqi) loadAqi();
  }, []);

  const aqiLevel = currentAqi ? getAqiLevel(currentAqi.aqi) : null;
  const healthRisk = currentAqi ? getHealthRisk(currentAqi.aqi, profile) : '';

  return (
    <div className="p-4 pb-24 space-y-4 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display gradient-text">BreathSmart</h1>
          <p className="text-sm text-muted-foreground">Your AI Pollution Doctor</p>
        </div>
        <Button variant="ghost" size="icon" onClick={loadAqi} disabled={loading} className="text-muted-foreground hover:text-primary">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </motion.div>

      {currentAqi && aqiLevel && (
        <>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <AqiGauge aqi={currentAqi.aqi} level={aqiLevel} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">{currentAqi.station}</span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span className="text-sm">{healthRisk}</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid grid-cols-3 gap-3">
            <div className="glass-card p-3 text-center">
              <Droplets className="w-5 h-5 mx-auto mb-1 text-info" />
              <p className="text-lg font-bold font-display">{currentAqi.pm25}</p>
              <p className="text-xs text-muted-foreground">PM2.5</p>
            </div>
            <div className="glass-card p-3 text-center">
              <Cloud className="w-5 h-5 mx-auto mb-1 text-warning" />
              <p className="text-lg font-bold font-display">{currentAqi.pm10}</p>
              <p className="text-xs text-muted-foreground">PM10</p>
            </div>
            <div className="glass-card p-3 text-center">
              <Wind className="w-5 h-5 mx-auto mb-1 text-destructive" />
              <p className="text-lg font-bold font-display">{currentAqi.no2}</p>
              <p className="text-xs text-muted-foreground">NO₂</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-2">
            <h2 className="text-lg font-semibold font-display">AI Insights</h2>
            {insights.map((insight, i) => (
              <InsightCard key={i} text={insight} delay={i * 0.1} />
            ))}
          </motion.div>
        </>
      )}

      {loading && !currentAqi && (
        <div className="flex flex-col items-center justify-center h-60 gap-3">
          <Wind className="w-10 h-10 text-primary animate-pulse" />
          <p className="text-muted-foreground">Fetching air quality data...</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
