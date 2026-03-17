import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { motion } from 'framer-motion';
import { User, LogOut, Save, Heart } from 'lucide-react';
import { toast } from 'sonner';

const ProfilePage = () => {
  const { profile, setProfile } = useAppStore();
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(profile.age?.toString() ?? '');
  const [city, setCity] = useState(profile.city);
  const [hasAsthma, setHasAsthma] = useState(profile.has_asthma);
  const [hasAllergies, setHasAllergies] = useState(profile.has_allergies);
  const [hasBreathingIssues, setHasBreathingIssues] = useState(profile.has_breathing_issues);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setEmail(user.email ?? '');

    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
    if (data) {
      setName(data.name ?? '');
      setAge(data.age?.toString() ?? '');
      setCity(data.city ?? '');
      setHasAsthma(data.has_asthma ?? false);
      setHasAllergies(data.has_allergies ?? false);
      setHasBreathingIssues(data.has_breathing_issues ?? false);
      setProfile({
        name: data.name ?? '',
        age: data.age,
        city: data.city ?? '',
        has_asthma: data.has_asthma ?? false,
        has_allergies: data.has_allergies ?? false,
        has_breathing_issues: data.has_breathing_issues ?? false,
      });
    }
  };

  const saveProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSaving(true);

    const updates = {
      name: name.trim(),
      age: age ? parseInt(age) : null,
      city: city.trim(),
      has_asthma: hasAsthma,
      has_allergies: hasAllergies,
      has_breathing_issues: hasBreathingIssues,
    };

    const { error } = await supabase.from('profiles').update(updates).eq('user_id', user.id);
    if (error) {
      toast.error('Failed to save profile');
    } else {
      setProfile(updates);
      toast.success('Profile saved!');
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out');
  };

  return (
    <div className="p-4 pb-24 max-w-lg mx-auto space-y-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold font-display gradient-text">Your Profile</h1>
        <p className="text-sm text-muted-foreground">{email}</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <span className="font-semibold font-display">Personal Info</span>
        </div>

        <div>
          <Label className="text-secondary-foreground">Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="mt-1 bg-secondary border-border" />
        </div>
        <div>
          <Label className="text-secondary-foreground">Age</Label>
          <Input value={age} onChange={(e) => setAge(e.target.value)} type="number" placeholder="Age" className="mt-1 bg-secondary border-border" />
        </div>
        <div>
          <Label className="text-secondary-foreground">City</Label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g., Delhi, Mumbai" className="mt-1 bg-secondary border-border" />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
            <Heart className="w-5 h-5 text-destructive" />
          </div>
          <span className="font-semibold font-display">Health Conditions</span>
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-secondary-foreground">Asthma</Label>
          <Switch checked={hasAsthma} onCheckedChange={setHasAsthma} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-secondary-foreground">Allergies</Label>
          <Switch checked={hasAllergies} onCheckedChange={setHasAllergies} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-secondary-foreground">Breathing Issues</Label>
          <Switch checked={hasBreathingIssues} onCheckedChange={setHasBreathingIssues} />
        </div>
      </motion.div>

      <div className="space-y-2">
        <Button onClick={saveProfile} disabled={saving} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
          <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Profile'}
        </Button>
        <Button onClick={handleLogout} variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10">
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </div>
    </div>
  );
};

export default ProfilePage;
