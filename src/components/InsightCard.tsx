import { motion } from 'framer-motion';

const InsightCard = ({ text, delay = 0 }: { text: string; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay }}
    className="glass-card p-3 text-sm leading-relaxed"
  >
    {text}
  </motion.div>
);

export default InsightCard;
