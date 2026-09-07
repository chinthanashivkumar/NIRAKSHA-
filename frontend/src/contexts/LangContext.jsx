import { createContext, useContext, useState } from 'react';
import { TRANSLATIONS } from '../translations';

const LangContext = createContext({ lang: 'EN', setLang: () => {}, t: (k) => k });

export const LangProvider = ({ children }) => {
  const stored = localStorage.getItem('niraksha_lang') || 'EN';
  const [lang, setLangState] = useState(stored);

  const setLang = (l) => {
    setLangState(l);
    localStorage.setItem('niraksha_lang', l);
  };

  const t = (key) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS['EN']?.[key] || key;

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
};

export const useLang = () => useContext(LangContext);
export default LangContext;
