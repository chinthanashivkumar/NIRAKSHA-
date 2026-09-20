import { useLang } from '../contexts/LangContext';

const BADGE_STYLES = {
  CRITICAL: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    border: 'border-red-500/50',
    pulse: 'pulse-glow-critical',
  },
  HIGH: {
    bg: 'bg-orange-500/20',
    text: 'text-orange-400',
    border: 'border-orange-500/40',
    pulse: 'pulse-glow-high',
  },
  MODERATE: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    pulse: '',
  },
  LOW: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    pulse: '',
  },
};

const RiskBadge = ({ level = 'LOW', showScore, score, size = 'sm' }) => {
  const { t } = useLang();
  const normalizedLevel = (level || 'LOW').toUpperCase();
  const style = BADGE_STYLES[normalizedLevel] || BADGE_STYLES.LOW;
  const pad = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold border ${pad} ${style.bg} ${style.text} ${style.border} ${style.pulse} transition-all duration-200`}
    >
      {normalizedLevel === 'CRITICAL' && <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />}
      {t(normalizedLevel)}
      {showScore && score !== undefined && (
        <span className="opacity-80 font-mono text-[11px]">({Number(score).toFixed(1)})</span>
      )}
    </span>
  );
};

export default RiskBadge;

