import { useLang } from '../contexts/LangContext';

const LanguageSwitcher = () => {
  const { lang, setLang } = useLang();
  const options = [
    { code: 'EN', label: 'EN' },
    { code: 'HI', label: 'हिन्दी' },
    { code: 'BN', label: 'বাংলা' },
    { code: 'AS', label: 'অসমীয়া' },
  ];

  return (
    <select
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      className="bg-slate-800 text-slate-200 border border-slate-600 rounded px-2 py-1 text-xs"
    >
      {options.map((opt) => (
        <option key={opt.code} value={opt.code}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};

export default LanguageSwitcher;
