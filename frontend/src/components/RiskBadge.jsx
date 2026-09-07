import { RISK_COLORS } from '../constants/stations';
import { useLang } from '../contexts/LangContext';

const RiskBadge = ({ level, showScore, score, size = 'sm' }) => {
  const { t } = useLang();
  const c = RISK_COLORS[level] || RISK_COLORS.LOW;
  const pad = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-bold ${pad}`}
      style={{ background: c.light, color: c.text, border: `1px solid ${c.border}` }}
    >
      {t(level)}
      {showScore && score !== undefined && <span className="opacity-70">({score.toFixed(1)})</span>}
    </span>
  );
};

export default RiskBadge;
