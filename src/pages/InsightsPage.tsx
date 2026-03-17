import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { generateInsights, getAqiLevel } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Brain, Plus, Trash2, Activity, AlertCircle, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InsightCard from '@/components/InsightCard';
import { toast } from 'sonner';

interface Symptom {
  id: string;
  symptom: string;
  severity: number;
  notes: string;
  recorded_at: string;
}

interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const InsightsPage = () => {
  const { currentAqi, profile, insights, setInsights, routes, selectedRouteId } = useAppStore();
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [newSymptom, setNewSymptom] = useState('');
  const [severity, setSeverity] = useState('3');
  const [tab, setTab] = useState<'insights' | 'symptoms' | 'alerts'>('insights');

  useEffect(() => {
    if (currentAqi) {
      const selectedRoute = routes.find((r) => r.id === selectedRouteId);
      const newInsights = generateInsights(currentAqi.aqi, profile, selectedRoute ? { avgAqi: selectedRoute.avgAqi, duration: selectedRoute.duration } : null);
      setInsights(newInsights);
    }
    loadSymptoms();
    loadAlerts();
  }, [currentAqi, selectedRouteId]);

  const loadSymptoms = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('symptoms').select('*').eq('user_id', user.id).order('recorded_at', { ascending: false }).limit(20);
    if (data) setSymptoms(data);
  };

  const loadAlerts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('alerts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
    if (data) setAlerts(data);
  };

  const addSymptom = async () => {
    if (!newSymptom.trim()) {
      toast.error('Enter a symptom');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('symptoms').insert({
      user_id: user.id,
      symptom: newSymptom.trim(),
      severity: parseInt(severity),
    });
    if (error) {
      toast.error('Failed to save symptom');
    } else {
      toast.success('Symptom recorded');
      setNewSymptom('');
      loadSymptoms();

      // Auto-generate alert if AQI is high and symptom is severe
      if (currentAqi && currentAqi.aqi > 150 && parseInt(severity) >= 4) {
        await supabase.from('alerts').insert({
          user_id: user.id,
          type: 'health',
          title: 'Health Alert',
          message: `High severity symptom "${newSymptom}" recorded during poor air quality (AQI: ${currentAqi.aqi}). Consider seeking medical advice.`,
        });
        loadAlerts();
      }
    }
  };

  const deleteSymptom = async (id: string) => {
    const { error } = await supabase.from('symptoms').delete().eq('id', id);
    if (!error) {
      setSymptoms((s) => s.filter((sym) => sym.id !== id));
      toast.success('Symptom deleted');
    }
  };

  const tabs = [
    { id: 'insights' as const, label: 'AI Insights', icon: Brain },
    { id: 'symptoms' as const, label: 'Symptoms', icon: Activity },
    { id: 'alerts' as const, label: 'Alerts', icon: Bell },
  ];

  return (
    <div className="p-4 pb-24 max-w-lg mx-auto space-y-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold font-display gradient-text">Health Intelligence</h1>
      </motion.div>

      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all ${
              tab === t.id ? 'bg-primary text-primary-foreground' : 'glass-card text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'insights' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          {insights.length > 0 ? (
            insights.map((insight, i) => <InsightCard key={i} text={insight} delay={i * 0.1} />)
          ) : (
            <div className="glass-card p-6 text-center text-muted-foreground">
              <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Visit the dashboard first to generate insights based on your air quality data.</p>
            </div>
          )}
        </motion.div>
      )}

      {tab === 'symptoms' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="glass-card p-4 space-y-3">
            <Input
              value={newSymptom}
              onChange={(e) => setNewSymptom(e.target.value)}
              placeholder="Describe your symptom..."
              className="bg-secondary border-border"
              onKeyDown={(e) => e.key === 'Enter' && addSymptom()}
            />
            <div className="flex gap-2">
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="w-32 bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Mild</SelectItem>
                  <SelectItem value="2">2 - Low</SelectItem>
                  <SelectItem value="3">3 - Moderate</SelectItem>
                  <SelectItem value="4">4 - Severe</SelectItem>
                  <SelectItem value="5">5 - Critical</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={addSymptom} className="flex-1 bg-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
          </div>
          {symptoms.map((s) => (
            <div key={s.id} className="glass-card p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{s.symptom}</p>
                <p className="text-xs text-muted-foreground">
                  Severity: {s.severity}/5 · {new Date(s.recorded_at).toLocaleDateString()}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteSymptom(s.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {symptoms.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-6">No symptoms recorded yet.</p>
          )}
        </motion.div>
      )}

      {tab === 'alerts' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          {alerts.map((a) => (
            <div key={a.id} className={`glass-card p-3 ${a.type === 'health' ? 'border-l-2 border-l-destructive' : 'border-l-2 border-l-warning'}`}>
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4" style={{ color: a.type === 'health' ? 'hsl(var(--destructive))' : 'hsl(var(--warning))' }} />
                <span className="text-sm font-semibold">{a.title}</span>
              </div>
              <p className="text-xs text-muted-foreground">{a.message}</p>
              <p className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString()}</p>
            </div>
          ))}
          {alerts.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-6">No alerts yet.</p>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default InsightsPage;
