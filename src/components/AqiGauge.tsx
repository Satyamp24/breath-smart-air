import { motion } from 'framer-motion';

const AqiGauge = ({ aqi, level }: { aqi: number; level: { label: string; color: string; className: string } }) => {
  const percentage = Math.min(aqi / 500, 1);

  return (
    <div className="glass-card p-6 text-center">
      <div className="relative w-40 h-40 mx-auto mb-4">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
          <motion.circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={level.color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${percentage * 326.7} 326.7`}
            initial={{ strokeDasharray: '0 326.7' }}
            animate={{ strokeDasharray: `${percentage * 326.7} 326.7` }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-4xl font-bold font-display"
            style={{ color: level.color }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {aqi}
          </motion.span>
          <span className="text-xs text-muted-foreground">AQI</span>
        </div>
      </div>
      <p className="font-semibold font-display text-lg" style={{ color: level.color }}>{level.label}</p>
    </div>
  );
};

export default AqiGauge;
