// Metadata for all 20 NER stations (hardcoded, matches seed.py order)
export const STATION_META = {
  "Guwahati":      { state: "Assam",           population: 957352, slope_angle: 15, ndvi: 0.55 },
  "Shillong":      { state: "Meghalaya",        population: 354759, slope_angle: 38, ndvi: 0.62 },
  "Imphal":        { state: "Manipur",          population: 268243, slope_angle: 12, ndvi: 0.58 },
  "Aizawl":        { state: "Mizoram",          population: 293416, slope_angle: 42, ndvi: 0.71 },
  "Kohima":        { state: "Nagaland",         population: 99039,  slope_angle: 45, ndvi: 0.69 },
  "Agartala":      { state: "Tripura",          population: 400004, slope_angle: 8,  ndvi: 0.60 },
  "Itanagar":      { state: "Arunachal Pradesh",population: 44971,  slope_angle: 32, ndvi: 0.73 },
  "Gangtok":       { state: "Sikkim",           population: 100000, slope_angle: 48, ndvi: 0.65 },
  "Cherrapunji":   { state: "Meghalaya",        population: 10086,  slope_angle: 35, ndvi: 0.72 },
  "Tawang":        { state: "Arunachal Pradesh",population: 11521,  slope_angle: 55, ndvi: 0.52 },
  "Ziro":          { state: "Arunachal Pradesh",population: 22391,  slope_angle: 28, ndvi: 0.68 },
  "Mangan":        { state: "Sikkim",           population: 5000,   slope_angle: 50, ndvi: 0.66 },
  "Namchi":        { state: "Sikkim",           population: 17000,  slope_angle: 40, ndvi: 0.67 },
  "Pasighat":      { state: "Arunachal Pradesh",population: 30000,  slope_angle: 22, ndvi: 0.71 },
  "Dima Hasao":    { state: "Assam",            population: 214102, slope_angle: 36, ndvi: 0.70 },
  "Churachandpur": { state: "Manipur",          population: 274143, slope_angle: 30, ndvi: 0.64 },
  "Tura":          { state: "Meghalaya",        population: 73500,  slope_angle: 25, ndvi: 0.66 },
  "Dimapur":       { state: "Nagaland",         population: 379117, slope_angle: 10, ndvi: 0.55 },
  "Silchar":       { state: "Assam",            population: 228958, slope_angle: 5,  ndvi: 0.58 },
  "Jorhat":        { state: "Assam",            population: 105000, slope_angle: 8,  ndvi: 0.60 },
};

export const RISK_COLORS = {
  LOW:      { bg: '#22c55e', text: '#4ade80', light: 'rgba(34,197,94,0.18)',  border: 'rgba(74,222,128,0.35)' },
  MODERATE: { bg: '#f59e0b', text: '#fbbf24', light: 'rgba(245,158,11,0.18)', border: 'rgba(251,191,36,0.35)' },
  HIGH:     { bg: '#f97316', text: '#fb923c', light: 'rgba(249,115,22,0.18)', border: 'rgba(251,146,60,0.35)' },
  CRITICAL: { bg: '#ef4444', text: '#f87171', light: 'rgba(239,68,68,0.20)',  border: 'rgba(248,113,113,0.40)' },
};

export const REPORT_TYPES = {
  crack:          { label: 'Crack Detected',  color: '#f59e0b', emoji: '🟡' },
  slope_movement: { label: 'Slope Movement',  color: '#f97316', emoji: '🟠' },
  road_blocked:   { label: 'Road Blocked',    color: '#ef4444', emoji: '🔴' },
  flooding:       { label: 'Flooding',        color: '#3b82f6', emoji: '🔵' },
};
