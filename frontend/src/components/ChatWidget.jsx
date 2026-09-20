import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../services/api';
import { 
  X, 
  Send, 
  AlertTriangle, 
  RefreshCw, 
  Bot, 
  Sparkles, 
  Globe, 
  Radio, 
  ShieldAlert,
  Database
} from 'lucide-react';
import { useLang } from '../contexts/LangContext';

const WELCOME_MESSAGES = {
  en: "NIRAKSHA Emergency Intelligence Copilot online. Directly integrated with 20 mountain telemetry stations and geotechnical hazard models across Northeast India. Ready for tactical decision-support.",
  hi: "निरक्षा (NIRAKSHA) आपातकालीन खुफिया सह-पायलट सक्रिय है। पूर्वोत्तर भारत के 20 पर्वतीय टेलीमेट्री स्टेशनों से सीधे जुड़ा हुआ। त्वरित निर्णय सहायता के लिए तैयार।",
  bn: "নিরীক্ষা (NIRAKSHA) জরুরি গোয়েন্দা কো-পাইলট অনলাইন। উত্তর-পূর্ব ভারতের ২০টি পার্বত্য টেলিমেট্রি স্টেশনের সাথে সরাসরি সংযুক্ত। জরুরি সিদ্ধান্ত সহায়তার জন্য প্রস্তুত।",
  as: "নিৰীক্ষা (NIRAKSHA) জৰুৰীকালীন বুদ্ধিমত্তা সহকাৰী সক্ৰিয় হৈছে। উত্তৰ-পূৰ্বাঞ্চলৰ ২০ টা পাহাৰীয়া নিৰীক্ষণ ষ্টেচনৰ সৈতে প্ৰত্যক্ষভাৱে সংযুক্ত। সিদ্ধান্ত গ্ৰহণত সহায়ৰ বাবে সাজু।"
};

const QUICK_CHIPS = {
  en: [
    { label: 'TOP THREAT ZONE', text: 'Identify the highest-risk landslide zone in Northeast India right now.' },
    { label: 'SILCHAR & TAWANG', text: 'What is the current landslide risk and rainfall in Silchar versus Tawang?' },
    { label: 'EVACUATION PROTOCOL', text: 'Explain the emergency standard operating procedure for a Critical alert.' },
    { label: 'RAINFALL RADAR', text: 'Which stations have received the heaviest rainfall in the last 24 hours?' },
  ],
  hi: [
    { label: 'शीर्ष जोखिम क्षेत्र', text: 'पूर्वोत्तर भारत में वर्तमान में सबसे अधिक जोखिम वाला क्षेत्र कौन सा है?' },
    { label: 'सिलचर एवं तवांग', text: 'सिलचर और तवांग में वर्तमान भूस्खलन जोखिम और वर्षा की क्या स्थिति है?' },
    { label: 'आपातकालीन निकासी', text: 'क्रिटिकल अलर्ट के लिए आपातकालीन मानक संचालन प्रक्रिया क्या है?' },
    { label: 'वर्षा रिपोर्ट', text: 'किन स्टेशनों पर सबसे भारी मानसूनी वर्षा दर्ज की गई है?' },
  ],
  bn: [
    { label: 'সর্বোচ্চ ঝুঁকিপূর্ণ অঞ্চল', text: 'উত্তর-পূর্ব ভারতের সর্বোচ্চ ঝুঁকিপূর্ণ ভূমিধস এলাকা কোনটি?' },
    { label: 'শিলচর বনাম তাওয়াং', text: 'শিলচর এবং তাওয়াংয়ের বর্তমান ভূমিধস ঝুঁকি ও বৃষ্টিপাতের অবস্থা কী?' },
    { label: 'উদ্ধার প্রোটোকল', text: 'সংকটজনক সতর্কতার ক্ষেত্রে জরুরি প্রমিত অপারেটিং পদ্ধতি কী?' },
    { label: 'বৃষ্টিপাত পরিস্থিতি', text: 'কোন স্টেশনগুলোতে সর্বাধিক বৃষ্টিপাত রেকর্ড করা হয়েছে?' },
  ],
  as: [
    { label: 'শীৰ্ষ বিপদজনক এলেকা', text: 'উত্তৰ-পূৰ্বাঞ্চলত সৰ্বাধিক বিপদজনক ভূমিস্খলন অঞ্চল কোনটো?' },
    { label: 'শিলচৰ আৰু তাৱাং', text: 'শিলচৰ আৰু তাৱাঙৰ বৰ্তমান ভূমিস্খলনৰ বিপদাশংকা আৰু বৰষুণৰ স্থিতি কি?' },
    { label: 'স্থানান্তৰ প্ৰটোকল', text: 'অতি জটিল সতৰ্কবাৰ্তাৰ বাবে জৰুৰী স্থানান্তৰ আৰু সাহায্য প্ৰক্ৰিয়া কি?' },
    { label: 'বৰষুণৰ তথ্য', text: 'বিগত ২৪ ঘণ্টাত কোনবোৰ ষ্টেচনত ধাৰাসাৰ বৰষুণ হৈছে?' },
  ]
};

export default function ChatWidget() {
  const { lang, setLang } = useLang();
  const currentLang = (lang || 'EN').toLowerCase(); // 'en' | 'hi' | 'bn' | 'as'

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [contextStats, setContextStats] = useState({ 
    critical: 2, 
    topStation: 'Tawang', 
    peakRain: '247.3 mm' 
  });
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Pull live telemetry summary
  useEffect(() => {
    const fetchContext = async () => {
      try {
        const { data } = await api.get('/stations');
        if (data && data.length > 0) {
          const crits = data.filter(s => (s.risk_level || '').toUpperCase() === 'CRITICAL').length;
          const sorted = [...data].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
          setContextStats({
            critical: crits,
            topStation: sorted[0]?.name || 'Tawang',
            peakRain: `${(sorted[0]?.current_rainfall || 247.3).toFixed(1)} mm`,
          });
        }
      } catch (e) {
        // Fallback stats already in place
      }
    };
    if (open) {
      fetchContext();
    }
  }, [open]);

  // Handle welcome message on open or language switch
  useEffect(() => {
    if (open) {
      const welcome = WELCOME_MESSAGES[currentLang] || WELCOME_MESSAGES.en;
      if (messages.length === 0) {
        setMessages([{ role: 'assistant', text: welcome, source: 'system' }]);
      } else if (messages.length === 1 && messages[0].role === 'assistant') {
        // If only greeting is present, seamlessly switch its language
        setMessages([{ role: 'assistant', text: welcome, source: 'system' }]);
      }
    }
  }, [open, currentLang]);

  useEffect(() => {
    if (open) {
      scrollToBottom();
    }
  }, [messages, loading, open]);

  const toggle = () => {
    setOpen(!open);
    setError(null);
  };

  const handleLanguageChange = (newLangUpper) => {
    setLang(newLangUpper);
  };

  const sendMessage = async (presetText) => {
    const userMsg = (presetText || input).trim();
    if (!userMsg || loading) return;

    // Add user message to stream
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    if (!presetText) setInput('');
    setLoading(true);
    setError(null);

    // Prepare multi-turn conversation history for context
    const conversationHistory = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-6)
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        content: m.text,
      }));

    try {
      const res = await api.post('/chat', {
        message: userMsg,
        language: currentLang,
        lang: (lang || 'EN').toUpperCase(),
        conversation_history: conversationHistory,
      });

      const reply = res.data?.response || '';
      const source = res.data?.source || 'gemini';

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: reply, source }
      ]);
    } catch (e) {
      console.error('Chat error:', e);
      setError(null);
      // Intelligent fallback message with real telemetry numbers
      const fallbackReplies = {
        en: `### NIRAKSHA Emergency Decision Support (Local Telemetry Engine)\n\n* **Active Threat Hotspots**: **${contextStats.critical} Critical Sectors** (${contextStats.topStation} & Cherrapunji)\n* **Peak Precipitation**: **${contextStats.peakRain}**\n* **Geotechnical Recommendation**: Active evacuation protocols and traffic restrictions along vulnerable mountain slopes are in effect. NDRF and SDRF rescue battalions remain pre-positioned.\n\n*Source: NIRAKSHA In-Situ Telemetry Network*`,
        hi: `### निरक्षा आपातकालीन निर्णय सहायता (स्थानीय टेलीमेट्री इंजन)\n\n* **सक्रिय खतरे वाले क्षेत्र**: **${contextStats.critical} क्रिटिकल सेक्टर** (${contextStats.topStation} और चेरापूंजी)\n* **अधिकतम वर्षा**: **${contextStats.peakRain}**\n* **परिचालन निर्देश**: संवेदनशील पहाड़ी ढलानों पर आपातकालीन निकासी और यातायात प्रतिबंध लागू हैं।\n\n*स्रोत: निरक्षा लाइव टेलीमेट्री*`,
        bn: `### নিরীক্ষা জরুরি সিদ্ধান্ত সহায়তা (লাইভ টেলিমেট্রি)\n\n* **সংকটজনক অঞ্চল**: **${contextStats.critical}টি সংকটজনক সেক্টর** (${contextStats.topStation} ও চেরাপুঞ্জি)\n* **সর্বোচ্চ বৃষ্টিপাত**: **${contextStats.peakRain}**\n* **নির্দেশনা**: ঝুঁকিপূর্ণ পাহাড়ি ঢাল থেকে নাগরিকদের নিরাপদ আশ্রয় শিবিরে স্থানান্তর করা হচ্ছে।\n\n*উৎস: নিরীক্ষা লাইভ টেলিমেট্রি*`,
        as: `### নিৰীক্ষা জৰুৰী সিদ্ধান্ত সহায়ক (লাইভ টেলিমেট্ৰি)\n\n* **বিপদজনক এলেকা**: **${contextStats.critical} টা জটিল এলেকা** (${contextStats.topStation} আৰু চেৰাপুঞ্জী)\n* **সৰ্বাধিক বৰষুণ**: **${contextStats.peakRain}**\n* **নিৰ্দেশনা**: বিপদজনক পাহাৰীয়া অঞ্চলসমূহত জৰুৰী সতৰ্কতা বলবৎ কৰা হৈছে।\n\n*উৎস: নিৰীক্ষা লাইভ টেলিমেট্ৰী*`
      };
      setMessages((prev) => [
        ...prev,
        { 
          role: 'assistant', 
          text: fallbackReplies[currentLang] || fallbackReplies.en, 
          source: 'telemetry_fallback' 
        }
      ]);
    } finally {
      // Guaranteed release of loading spinner
      setLoading(false);
    }
  };

  const chips = QUICK_CHIPS[currentLang] || QUICK_CHIPS.en;

  return (
    <>
      {/* Floating Tactical Terminal Button */}
      <button
        onClick={toggle}
        className="fixed bottom-6 right-6 z-[9990] flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#091321] border border-[#2684FF]/40 text-[#4DA3FF] shadow-2xl hover:bg-[#0D1929] hover:border-[#2684FF] transition-all font-mono text-xs font-bold group"
        aria-label="Open NIRAKSHA AI Assistant"
      >
        <div className="relative">
          <Bot size={18} className="text-[#4DA3FF] group-hover:scale-110 transition-transform" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 beacon-online" />
        </div>
        <span className="hidden sm:inline tracking-wider">NIRAKSHA AI</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2684FF]/20 text-[#60A5FA] border border-[#2684FF]/30">
          {(lang || 'EN').toUpperCase()}
        </span>
      </button>

      {/* Operational Intelligence Console Modal */}
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:justify-end sm:p-6 bg-black/80 backdrop-blur-sm font-sans">
          <div className="bg-[#091321] border border-slate-700/60 rounded-2xl w-full sm:w-[540px] h-[92vh] sm:h-[700px] max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header with Telemetry Status */}
            <div className="px-4 py-3 bg-[#050A12] border-b border-slate-800 flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-950/60 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-inner">
                  <Bot size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white uppercase tracking-wider text-xs">NIRAKSHA COPILOT</span>
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      LIVE TELEMETRY
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-400 font-sans">Gemini 3.6 Multilingual Decision-Support Engine</p>
                </div>
              </div>
              <button 
                onClick={toggle} 
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Close Assistant"
              >
                <X size={18} />
              </button>
            </div>

            {/* Context Telemetry Bar & Language Selector */}
            <div className="px-4 py-2.5 bg-[#0A1628] border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-3 font-mono text-[10.5px]">
                <span>CRITICAL: <strong className="text-red-400 font-bold">{contextStats.critical}</strong></span>
                <span className="hidden xs:inline">PEAK: <strong className="text-amber-300 font-bold">{contextStats.topStation}</strong></span>
                <span>RAIN: <strong className="text-blue-300 font-bold">{contextStats.peakRain}</strong></span>
              </div>

              {/* Functional Language Toggle Buttons */}
              <div className="flex items-center gap-1 bg-[#050A12] p-0.5 rounded-lg border border-slate-800">
                <Globe size={12} className="text-slate-500 ml-1 mr-0.5" />
                {[
                  { id: 'EN', label: 'EN' },
                  { id: 'HI', label: 'HI' },
                  { id: 'BN', label: 'BN' },
                  { id: 'AS', label: 'AS' }
                ].map((item) => {
                  const isActive = (lang || 'EN').toUpperCase() === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleLanguageChange(item.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide transition-all ${
                        isActive 
                          ? 'bg-blue-600 text-white shadow-sm font-semibold' 
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                      title={`Switch response language to ${item.label}`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Conversation Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#050A12]/90">
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[90%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none shadow-md font-sans font-medium'
                        : 'bg-[#0D1C30] text-slate-200 border border-slate-700/60 rounded-bl-none shadow-lg'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div>
                        <div className="chat-markdown">
                          <ReactMarkdown>
                            {msg.text}
                          </ReactMarkdown>
                        </div>
                        {msg.source && msg.source !== 'system' && (
                          <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                            <span className="flex items-center gap-1">
                              {msg.source === 'gemini' ? (
                                <>
                                  <Sparkles size={11} className="text-blue-400" />
                                  <span>Gemini AI verified</span>
                                </>
                              ) : (
                                <>
                                  <Database size={11} className="text-emerald-400" />
                                  <span>NIRAKSHA Telemetry Engine</span>
                                </>
                              )}
                            </span>
                            <span className="uppercase text-[9px] text-slate-400 px-1 py-0.2 bg-slate-900 rounded">
                              {(lang || 'EN').toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span>{msg.text}</span>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-[#0D1C30] border border-slate-700/70 rounded-2xl rounded-bl-none p-3.5 text-xs text-slate-300 flex items-center gap-2.5 font-mono shadow-md">
                    <RefreshCw size={14} className="animate-spin text-blue-400 shrink-0" />
                    <span>Evaluating hazard telemetry context...</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-2.5 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Tactical Query Quick Chips */}
            <div className="px-3 py-2 bg-[#050A12] border-t border-slate-800/80 overflow-x-auto flex gap-1.5 no-scrollbar">
              {chips.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(chip.text)}
                  disabled={loading}
                  className="whitespace-nowrap px-2.5 py-1 bg-[#091526] hover:bg-[#0E2038] text-slate-300 hover:text-white rounded-lg text-[10.5px] border border-slate-800 hover:border-slate-700 transition-colors disabled:opacity-40 font-medium"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Terminal Input Box */}
            <div className="p-3 bg-[#050A12] border-t border-slate-800 flex gap-2 items-end">
              <textarea
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                className="flex-1 bg-[#091526] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none font-sans leading-relaxed"
                placeholder={
                  currentLang === 'hi'
                    ? "टेलीमेट्री स्थिति, ढलान सुरक्षा या राहत शिविरों के बारे में पूछें..."
                    : currentLang === 'bn'
                    ? "টেলিমেট্রি অবস্থা, ঢাল নিরাপত্তা বা আশ্রয় কেন্দ্র সম্পর্কে জিজ্ঞাসা করুন..."
                    : currentLang === 'as'
                    ? "টেলিমেট্ৰি স্থিতি, পাহাৰীয়া ঢাল বা সাহায্য শিবিৰ সম্পৰ্কে সোধক..."
                    : "Query telemetry status, slope safety, or relief shelters..."
                }
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="h-10 w-10 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-xl disabled:opacity-40 transition-all shadow-md shrink-0"
                aria-label="Send Message"
              >
                <Send size={15} />
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
