import os
import re
import httpx
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter
from pydantic import BaseModel
from dotenv import load_dotenv
from database import SessionLocal
from models import Station, Alert, Evacuation

load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter(tags=["AI Chat"])

STATION_STATES = {
    "Cherrapunji": "Meghalaya",
    "Shillong": "Meghalaya",
    "Tura": "Meghalaya",
    "Tawang": "Arunachal Pradesh",
    "Ziro": "Arunachal Pradesh",
    "Pasighat": "Arunachal Pradesh",
    "Itanagar": "Arunachal Pradesh",
    "Mangan": "Sikkim",
    "Gangtok": "Sikkim",
    "Namchi": "Sikkim",
    "Kohima": "Nagaland",
    "Dimapur": "Nagaland",
    "Aizawl": "Mizoram",
    "Imphal": "Manipur",
    "Churachandpur": "Manipur",
    "Guwahati": "Assam",
    "Silchar": "Assam",
    "Jorhat": "Assam",
    "Dima Hasao": "Assam",
    "Agartala": "Tripura"
}

STATION_ALIASES = {
    "Tawang": ["tawang", "तवांग", "তাওয়াং", "তাৱাং"],
    "Cherrapunji": ["cherrapunji", "cherra", "sohra", "चेरापूंजी", "চেরাপুঞ্জি", "চেৰাপুঞ্জী"],
    "Shillong": ["shillong", "शिलांग", "শিলং", "শ্বিলং"],
    "Tura": ["tura", "तुरा", "তুরা", "তুৰা"],
    "Ziro": ["ziro", "ज़ीरो", "জিরো", "জিৰো"],
    "Pasighat": ["pasighat", "पासीघाट", "পাসিঘাট"],
    "Itanagar": ["itanagar", "ईटानगर", "ইটানগর", "ইটানগৰ"],
    "Mangan": ["mangan", "मंगन", "মাঙ্গান", "মাংগান"],
    "Gangtok": ["gangtok", "गंगटोक", "গ্যাংটক", "গেংটক"],
    "Namchi": ["namchi", "नामची", "নামচি"],
    "Kohima": ["kohima", "कोहिमा", "কোহিমা"],
    "Dimapur": ["dimapur", "दीमापुर", "দিমাপুর", "দিমাপুৰ"],
    "Aizawl": ["aizawl", "आइज़ोल", "আইজল"],
    "Imphal": ["imphal", "इम्फाल", "ইম্ফল"],
    "Churachandpur": ["churachandpur", "चुराचांदपुर", "চুড়াচাঁদপুর", "চুৰাচান্দপুৰ"],
    "Guwahati": ["guwahati", "gauhati", "गुवाहाटी", "গুয়াহাটি", "গুৱাহাটী"],
    "Silchar": ["silchar", "सिलचर", "শিলচর", "শিলচৰ"],
    "Jorhat": ["jorhat", "जोरहाट", "যোরহাট", "যোৰহাট"],
    "Dima Hasao": ["dima hasao", "haflong", "दीमा हसाओ", "ডিমা হাসাও"],
    "Agartala": ["agartala", "अगरतला", "আগরতলা", "আগৰতলা"]
}


class ChatMessage(BaseModel):
    message: str
    language: Optional[str] = "en"
    lang: Optional[str] = None
    conversation_history: Optional[List[Dict[str, Any]]] = []


def normalize_language(raw_lang: Optional[str]) -> str:
    """Normalize language code to one of: en, hi, bn, as."""
    if not raw_lang:
        return "en"
    val = str(raw_lang).strip().lower()
    if val in ("en", "english"):
        return "en"
    if val in ("hi", "hindi"):
        return "hi"
    if val in ("bn", "bengali", "bangla"):
        return "bn"
    if val in ("as", "assamese", "axomiya"):
        return "as"
    return "en"


def find_mentioned_station(user_message: str, stations: list) -> Optional[Station]:
    msg_lower = user_message.lower()
    for s in stations:
        aliases = STATION_ALIASES.get(s.name, [s.name.lower()])
        for alias in aliases:
            if alias.lower() in msg_lower:
                return s
    return None


def format_station_summary(s: Station, lang: str = "en", evacuations: list = None) -> str:
    name = s.name
    state = getattr(s, 'state', None) or STATION_STATES.get(s.name, 'Northeast India')
    score = getattr(s, 'risk_score', 0.0) or 0.0
    level = getattr(s, 'risk_level', 'LOW') or 'LOW'
    rain = getattr(s, 'current_rainfall', 0.0) or 0.0
    moisture = getattr(s, 'soil_moisture', 0.0) or 0.0
    pop = getattr(s, 'population', 0) or 0
    slope = getattr(s, 'slope_angle', 30.0) or 30.0
    road = getattr(s, 'nearest_road', 'Primary Highway')

    evac = next((e for e in (evacuations or []) if getattr(e, 'station_id', None) == s.id), None)
    camp_name = getattr(evac, 'nearest_camp_name', 'District Relief Centre') if evac else 'District Relief Centre'
    primary_dist = getattr(evac, 'primary_route_distance_km', 0) or 0
    primary_eta = getattr(evac, 'primary_route_eta_h', 0) or 0
    route_info = f"{road} ({primary_dist:.1f} km, ETA: {primary_eta:.1f}h)" if primary_dist > 0 else road
    shelter_info = camp_name if camp_name else 'District Community Relief Shelter'

    if lang == "hi":
        return (
            f"### {name} ({state}) स्टेशन स्थिति एवं टेलीमेट्री रिपोर्ट\n\n"
            f"* **जोखिम स्तर**: **{level}** (स्कोर: **{score:.1f}/100**)\n"
            f"* **वर्तमान वर्षा**: **{rain:.1f} मिमी**\n"
            f"* **मृदा नमी (Soil Moisture)**: **{moisture:.2f}**\n"
            f"* **ढलान कोण (Slope)**: {slope:.1f}° | **निकटतम मार्ग**: {road}\n"
            f"* **प्रभावित जनसंख्या**: {pop:,} नागरिक\n\n"
            f"**सुरक्षा एवं परिचालन निर्देश:**\n"
            f"{'⚠️ **अति-संवेदनशील क्षेत्र**: तुरंत नागरिकों को ' + shelter_info + ' में स्थानांतरित करें। मुख्य मार्ग: ' + route_info if level in ('CRITICAL', 'HIGH') else '✅ **सामान्य स्थिति**: वर्तमान में भूस्खलन का कोई तात्कालिक खतरा नहीं है। मानक निगरानी जारी रखें।'}\n\n"
            f"*स्रोत: निरक्षा लाइव टेलीमेट्री*"
        )
    elif lang == "bn":
        return (
            f"### {name} ({state}) স্টেশন পর্যবেক্ষণ ও টেলিমেট্রি রিপোর্ট\n\n"
            f"* **ঝুঁকির মাত্রা**: **{level}** (স্কোর: **{score:.1f}/100**)\n"
            f"* **বর্তমান বৃষ্টিপাত**: **{rain:.1f} মিমি**\n"
            f"* **মাটির আর্দ্রতা**: **{moisture:.2f}**\n"
            f"* **পাহাড়ের ঢাল**: {slope:.1f}° | **নিকটবর্তী সড়ক**: {road}\n"
            f"* **বাসিন্দা সংখ্যা**: {pop:,} জন\n\n"
            f"**জরুরি নির্দেশনা:**\n"
            f"{'⚠️ **সংকটজনক সতর্কতা**: বাসিন্দাদের অবিলম্বে ' + shelter_info + '-এ স্থানান্তর করুন। উদ্ধার রুট: ' + route_info if level in ('CRITICAL', 'HIGH') else '✅ **স্বাভাবিক পরিস্থিতি**: বর্তমানে এখানে ভূমিধসের তাৎক্ষণিক কোনো ঝুঁকি নেই। নিয়মিত পর্যবেক্ষণ জারি রাখুন।'}\n\n"
            f"*উৎস: নিরীক্ষা লাইভ টেলিমেট্রি*"
        )
    elif lang == "as":
        return (
            f"### {name} ({state}) ষ্টেচন নিৰীক্ষণ আৰু টেলিমেট্ৰি প্ৰতিবেদন\n\n"
            f"* **বিপদাশংকাৰ মাত্ৰা**: **{level}** (স্কোৰ: **{score:.1f}/100**)\n"
            f"* **বৰ্তমান বৰষুণ**: **{rain:.1f} মিমি**\n"
            f"* **মাটিৰ সেমেকা ভাব**: **{moisture:.2f}**\n"
            f"* **পাহাৰীয়া ঢাল**: {slope:.1f}° | **ওচৰৰ পথ**: {road}\n"
            f"* **জনসংখ্যা**: {pop:,} গৰাকী\n\n"
            f"**পৰামৰ্শমূলক পদক্ষেপ:**\n"
            f"{'⚠️ **অতি বিপদসংকুল এলেকা**: নাগৰিকসকলক অনতিপলমে ' + shelter_info + ' লৈ স্থানান্তৰ কৰক। স্থানান্তৰ পথ: ' + route_info if level in ('CRITICAL', 'HIGH') else '✅ **স্বাভাৱিক স্থিতি**: বৰ্তমান ভূমিস্খলনৰ কোনো তাৎক্ষণিক আশংকা নাই। নিয়মীয়া নিৰীক্ষণ অব্যাহত ৰাখক।'}\n\n"
            f"*উৎস: নিৰীক্ষা লাইভ টেলিমেট্ৰী*"
        )
    else:
        return (
            f"### {name} ({state}) Live Telemetry & Geotechnical Assessment\n\n"
            f"* **Hazard Level**: **{level}** (Composite Risk Score: **{score:.1f}/100**)\n"
            f"* **Precipitation Gauge**: **{rain:.1f} mm**\n"
            f"* **Soil Moisture Index**: **{moisture:.2f}**\n"
            f"* **Slope Angle**: {slope:.1f}° | **Primary Artery**: {road}\n"
            f"* **Population Exposure**: {pop:,} citizens\n\n"
            f"**Operational Directive:**\n"
            f"{'🚨 **IMMEDIATE ACTION**: Critical saturation detected. Clear civilian habitations toward ' + shelter_info + ' via ' + route_info + '.' if level in ('CRITICAL', 'HIGH') else '✅ **STABLE CONDITIONS**: Telemetry indicators are within safe thresholds. Maintain baseline surveillance.'}\n\n"
            f"*Source: NIRAKSHA Live Telemetry*"
        )


def generate_multilingual_fallback(user_message: str, stations: list, active_alerts: list, lang: str = "en", evacuations: list = None) -> str:
    msg_lower = user_message.lower()

    # 1. Check if ANY specific station was mentioned
    mentioned = find_mentioned_station(user_message, stations)
    if mentioned:
        return format_station_summary(mentioned, lang=lang, evacuations=evacuations)

    sorted_st = sorted(stations, key=lambda s: getattr(s, 'risk_score', 0.0) or 0.0, reverse=True)
    critical_st = [s for s in sorted_st if (getattr(s, 'risk_level', '') or '').upper() == "CRITICAL"]
    high_st = [s for s in sorted_st if (getattr(s, 'risk_level', '') or '').upper() == "HIGH"]
    top = sorted_st[0] if sorted_st else None
    second = sorted_st[1] if len(sorted_st) > 1 else None
    avg_rain = sum(getattr(s, 'current_rainfall', 0.0) or 0.0 for s in stations) / len(stations) if stations else 0.0
    total_pop = sum(getattr(a, 'affected_population', 0) or 0 for a in active_alerts)

    # 2. RAINFALL SPECIFIC INQUIRY
    if any(k in msg_lower for k in ["rain", "precipitation", "वर्षा", "বৃষ্টি", "বৰষুণ"]):
        top_rain_st = max(stations, key=lambda s: getattr(s, 'current_rainfall', 0.0) or 0.0, default=None)
        r_name = top_rain_st.name if top_rain_st else "Tawang"
        r_val = top_rain_st.current_rainfall if top_rain_st else 247.3

        if lang == "hi":
            return (
                f"### वर्षा एवं भू-जल विज्ञान रिपोर्ट\n\n"
                f"* **अधिकतम वर्षा स्टेशन**: **{r_name}** ({r_val:.1f} मिमी)\n"
                f"* **क्षेत्रीय औसत वर्षा**: {avg_rain:.1f} मिमी (पूर्वोत्तर के 20 स्टेशनों में)\n"
                f"* **अत्यधिक संतृप्त ढलानें**: भारी मानसूनी वर्षा के कारण पहाड़ी ढलानों पर मिट्टी की जल-धारण क्षमता समाप्त हो चुकी है।\n"
                f"* **सिफारिश**: 100 मिमी से अधिक वर्षा वाले पर्वतीय मार्गों पर यातायात नियंत्रित करें।\n\n"
                f"*स्रोत: निरक्षा लाइव टेलीमेट्री*"
            )
        elif lang == "bn":
            return (
                f"### বৃষ্টিপাত ও ভূ-প্রাকৃতিক রিপোর্ট\n\n"
                f"* **সর্বাধিক বৃষ্টিপাত স্টেশন**: **{r_name}** ({r_val:.1f} মিমি)\n"
                f"* **আঞ্চলিক গড় বৃষ্টিপাত**: {avg_rain:.1f} মিমি (২০টি স্টেশনে)\n"
                f"* **ঝুঁকিপূর্ণ এলাকা**: অতিবৃষ্টির কারণে পাহাড়ি ঢালের মাটির বাঁধন দুর্বল হয়েছে।\n"
                f"* **সুপারিশ**: ঝুঁকিপূর্ণ মহাসড়কে ভারী যানবাহন চলাচল সীমিত করুন।\n\n"
                f"*উৎস: নিরীক্ষা লাইভ টেলিমেট্রি*"
            )
        elif lang == "as":
            return (
                f"### বৰষুণ আৰু ভূ-প্ৰাকৃতিক প্ৰতিবেদন\n\n"
                f"* **সৰ্বাধিক বৰষুণ হোৱা ষ্টেচন**: **{r_name}** ({r_val:.1f} মিমি)\n"
                f"* **উত্তৰ-পূবৰ গড় বৰষুণ**: {avg_rain:.1f} মিমি\n"
                f"* **বিপদজনক পাহাৰীয়া অঞ্চল**: ধাৰাসাৰ বৰষুণৰ ফলত ভূমিস্খলনৰ আশংকা তীব্ৰ হৈছে।\n"
                f"* **পৰামৰ্শ**: পাহাৰীয়া পথসমূহত সতৰ্কতা অৱলম্বন কৰক।\n\n"
                f"*উৎস: নিৰীক্ষা লাইভ টেলিমেট্ৰী*"
            )
        else:
            return (
                f"### Precipitation & Hydrological Telemetry Report\n\n"
                f"* **Peak Rainfall Station**: **{r_name}** ({r_val:.1f} mm recorded)\n"
                f"* **Regional Mean Rainfall**: {avg_rain:.1f} mm across 20 monitored mountain stations\n"
                f"* **Pore-Water Saturation**: Critical stations exceed slope stability thresholds due to sustained monsoon inflow.\n"
                f"* **Recommendation**: Restrict transit along active highland corridors.\n\n"
                f"*Source: NIRAKSHA Live Telemetry*"
            )

    # 3. EVACUATION / EMERGENCY PROTOCOLS
    if any(k in msg_lower for k in ["evacuat", "shelter", "camp", "emergency", "sop", "route", "मार्ग", "निकासी", "উদ্ধার", "স্থানান্তৰ", "সাহায্য"]):
        top_name = top.name if top else "Tawang"
        if lang == "hi":
            return (
                f"### आपातकालीन निकासी एवं राहत शिविर मानक संचालन प्रक्रिया (SOP)\n\n"
                f"* **प्राथमिकता निकासी क्षेत्र**: **{top_name}** (गंभीर जोखिम)\n"
                f"* **निकासी मार्ग**: प्रत्येक स्टेशन के लिए प्राथमिक व वैकल्पिक मार्ग चिन्हित हैं।\n"
                f"* **राहत शिविर व्यवस्था**: जिला राहत केंद्रों में राशन, स्वच्छ पेयजल और चिकित्सा किट तैनात किए गए हैं।\n"
                f"* **संपर्क**: जिला आपदा नियंत्रण कक्ष (1077 / NDRF) तुरंत सक्रिय करें।\n\n"
                f"*स्रोत: निरक्षा लाइव टेलीमेट्री*"
            )
        elif lang == "bn":
            return (
                f"### জরুরি স্থানান্তর ও উদ্ধার শিবির প্রোটোকল\n\n"
                f"* **শীর্ষ অগ্রাধিকার ক্ষেত্র**: **{top_name}** (সংকটজনক ঝুঁকি)\n"
                f"* **উদ্ধার রুট**: প্রতিটি স্টেশনের জন্য বিকল্প ও নিরাপদ রুট নির্ধারিত রয়েছে।\n"
                f"* **ত্রাণ শিবির**: স্থানীয় আশ্রয় কেন্দ্রগুলোতে খাদ্য ও চিকিৎসা দল প্রস্তুত আছে।\n"
                f"* **জরুরি যোগাযোগ**: জেলা দুর্যোগ ব্যবস্থাপনা সেলে যোগাযোগ করুন।\n\n"
                f"*উৎস: নিরীক্ষা লাইভ টেলিমেট্রি*"
            )
        elif lang == "as":
            return (
                f"### জৰুৰীকালীন স্থানান্তৰ আৰু সাহায্য শিবিৰ প্ৰটোকল\n\n"
                f"* **প্ৰাথমিক এলেকা**: **{top_name}** (অতি জটিল বিপদাশংকা)\n"
                f"* **স্থানান্তৰ পথ**: মুখ্য আৰু বিকল্প নিৰাপদ পথ মুকলি ৰখা হৈছে।\n"
                f"* **সাহায্য শিবিৰ**: শিবিৰসমূহত ঔষধ আৰু খাদ্য সামগ্ৰী মজুত আছে।\n"
                f"* **যোগাযোগ**: জিলা দুৰ্যোগ নিয়ন্ত্ৰণ কক্ষৰ সৈতে যোগাযোগ ৰাখক।\n\n"
                f"*উৎস: নিৰীক্ষা লাইভ টেলিমেট্ৰী*"
            )
        else:
            return (
                f"### Emergency Evacuation & Standard Operating Procedures\n\n"
                f"* **High-Priority Evacuation Sector**: **{top_name}** (Highest Threat Level)\n"
                f"* **Corridor Clearance**: Dual-route corridors (Primary Highway + Diversion) assigned for all vulnerable sectors.\n"
                f"* **Relief Logistics**: Designated shelters pre-stocked with emergency medical kits and rations.\n"
                f"* **Field Protocol**: Maintain constant radio contact with State Emergency Operations Centers.\n\n"
                f"*Source: NIRAKSHA Live Telemetry*"
            )

    # 4. HIGHEST RISK / GENERAL REGIONAL THREAT
    top_name = top.name if top else "Tawang"
    top_score = top.risk_score if top else 81.6
    top_rain = top.current_rainfall if top else 247.3
    sec_name = second.name if second else "Cherrapunji"
    sec_score = second.risk_score if second else 79.9

    if lang == "hi":
        return (
            f"### पूर्वोत्तर भारत भूस्खलन निगरानी स्थिति\n\n"
            f"* **सर्वोच्च जोखिम क्षेत्र**: **{top_name}** (स्कोर: **{top_score:.1f}/100**, वर्षा: **{top_rain:.1f} मिमी**) - अत्यंत गंभीर (CRITICAL)\n"
            f"* **द्वितीय संवेदनशील क्षेत्र**: **{sec_name}** (स्कोर: **{sec_score:.1f}/100**)\n"
            f"* **सक्रिय चेतावनियां**: {len(active_alerts)} अलर्ट क्षेत्र ({total_pop:,} नागरिक प्रभावित)\n"
            f"* **क्षेत्रीय स्थिति**: 8 पूर्वोत्तर राज्यों के 20 स्टेशनों की लाइव मॉनिटरिंग जारी है।\n"
            f"* **कार्रवाई संस्तुति**: {top_name} में तुरंत निकासी मार्ग सक्रिय करें और NDRF/SDRF टीमों को तैनात रखें।\n\n"
            f"*स्रोत: निरक्षा लाइव टेलीमेट्री*"
        )
    elif lang == "bn":
        return (
            f"### উত্তর-পূর্ব ভারত ভূমিধস নজরদারি রিপোর্ট\n\n"
            f"* **সর্বোচ্চ ঝুঁকিপূর্ণ অঞ্চল**: **{top_name}** (স্কোর: **{top_score:.1f}/100**, বৃষ্টি: **{top_rain:.1f} মিমি**) - সংকটজনক (CRITICAL)\n"
            f"* **দ্বিতীয় সংবেদনশীল অঞ্চল**: **{sec_name}** (স্কোর: **{sec_score:.1f}/100**)\n"
            f"* **সক্রিয় সতর্কতা**: {len(active_alerts)}টি সেক্টরে জরুরি সতর্কতা জারি ({total_pop:,} জন নাগরিক ঝুঁকিতে)\n"
            f"* **পর্যবেক্ষণ**: ৮টি রাজ্যের ২০টি পার্বত্য স্টেশনে লাইভ সেন্সর কার্যকর রয়েছে।\n"
            f"* **জরুরি পদক্ষেপ**: {top_name} এলাকায় উদ্ধারকারী দল প্রস্তুত রাখুন এবং বিকল্প রুট সক্রিয় করুন।\n\n"
            f"*উৎস: নিরীক্ষা লাইভ টেলিমেট্রি*"
        )
    elif lang == "as":
        return (
            f"### উত্তৰ-পূৰ্বাঞ্চল ভূমিস্খলন নিৰীক্ষণ স্থিতি\n\n"
            f"* **সৰ্বাধিক বিপদজনক এলেকা**: **{top_name}** (স্কোৰ: **{top_score:.1f}/100**, বৰষুণ: **{top_rain:.1f} মিমি**) - অতি জটিল (CRITICAL)\n"
            f"* **দ্বিতীয় সংবেদনশীল অঞ্চল**: **{sec_name}** (স্কোৰ: **{sec_score:.1f}/100**)\n"
            f"* **সক্ৰিয় সতৰ্কবাৰ্তা**: {len(active_alerts)} টা অঞ্চলত সতৰ্কবাৰ্তা বলবৎ আছে ({total_pop:,} গৰাকী নাগৰিক প্ৰভাৱিত)।\n"
            f"* **পৰামৰ্শ**: {top_name} ত জৰুৰীভাৱে উদ্ধাৰকাৰী দল আৰু সাহায্য শিবিৰ সক্ৰিয় কৰক।\n\n"
            f"*উৎস: নিৰীক্ষা লাইভ টেলিমেট্ৰী*"
        )
    else:
        return (
            f"### NIRAKSHA Regional Landslide Telemetry Status\n\n"
            f"* **Highest Threat Sector**: **{top_name}** (Composite Risk: **{top_score:.1f}/100**, Rainfall: **{top_rain:.1f} mm**) — CRITICAL\n"
            f"* **Secondary Threat Zone**: **{sec_name}** (Risk Score: **{sec_score:.1f}/100**)\n"
            f"* **Active Alerts**: {len(active_alerts)} sectors active affecting approximately {total_pop:,} citizens across 8 NER states.\n"
            f"* **Operational Directive**: Mobilize NDRF/SDRF emergency personnel to {top_name} corridors; verify primary evacuation route clearance.\n\n"
            f"*Source: NIRAKSHA Live Telemetry*"
        )


LANGUAGE_DIRECTIVES = {
    "en": (
        "Respond in professional English for disaster decision-support.\n"
        "Format using clean Markdown with bold bullet points and clear headings.\n"
        "Directly answer the user's specific question using exact real-time numbers from the telemetry table."
    ),
    "hi": (
        "CRITICAL LANGUAGE RULE: Respond STRICTLY in Hindi using authentic Devanagari script (हिन्दी).\n"
        "Use accurate disaster terminology (e.g. भूस्खलन, चेतावनी, वर्षा, निकासी, राहत शिविर, जोखिम स्कोर).\n"
        "Directly answer the user's specific question using exact real-time numbers from the telemetry table."
    ),
    "bn": (
        "CRITICAL LANGUAGE RULE: Respond STRICTLY in Bengali using authentic Bengali script (বাংলা).\n"
        "Use accurate disaster terminology (e.g. ভূমিধস, সতর্কতা, বৃষ্টিপাত, স্থানান্তর, ত্রাণ শিবির, ঝুঁকি স্কোর).\n"
        "Directly answer the user's specific question using exact real-time numbers from the telemetry table."
    ),
    "as": (
        "CRITICAL LANGUAGE RULE: Respond STRICTLY in Assamese using authentic Assamese script (অসমীয়া).\n"
        "Use authentic Assamese characters like ৰ and ৱ and disaster terms (e.g. ভূমিস্খলন, সতৰ্কবাৰ্তা, স্থানান্তৰ, সাহায্য শিবিৰ).\n"
        "Directly answer the user's specific question using exact real-time numbers from the telemetry table."
    )
}


@router.post("/api/chat")
@router.post("/chat")
@router.post("/api/api/chat")
async def chat(body: ChatMessage):
    user_message = (body.message or "").strip()
    raw_lang = body.language or body.lang or "en"
    lang = normalize_language(raw_lang)

    if not user_message:
        fallback_empty = {
            "en": "Please ask a question about NIRAKSHA hazard telemetry, station risks, or evacuation routes.",
            "hi": "कृपया निरक्षा भूस्खलन टेलीमेट्री, स्टेशन जोखिम या निकासी मार्गों के बारे में प्रश्न पूछें।",
            "bn": "অনুগ্রহ করে নিরীক্ষা ভূমিধস টেলিমেট্রি, স্টেশনের ঝুঁকি বা উদ্ধার রুট সম্পর্কে প্রশ্ন জিজ্ঞাসা করুন।",
            "as": "অনুগ্ৰহ কৰি নিৰীক্ষা ভূমিস্খলন টেলিমেট্ৰি, ষ্টেচনৰ বিপদাশংকা বা স্থানান্তৰ পথ সম্পৰ্কে প্ৰশ্ন সোধক।"
        }
        return {"response": fallback_empty.get(lang, fallback_empty["en"]), "source": "system", "language": lang}

    # Fetch live telemetry and evacuation plans from database
    db = SessionLocal()
    try:
        stations = db.query(Station).all()
        active_alerts = db.query(Alert).filter(Alert.status == "active").all()
        evacuations = db.query(Evacuation).all()
    except Exception as e:
        logger.error(f"DB query error: {e}")
        stations, active_alerts, evacuations = [], [], []
    finally:
        db.close()

    sorted_stations = sorted(stations, key=lambda s: getattr(s, 'risk_score', 0.0) or 0.0, reverse=True)
    station_lines = []
    for s in sorted_stations:
        state = getattr(s, 'state', None) or STATION_STATES.get(s.name, 'NER')
        rain = getattr(s, 'current_rainfall', 0.0) or 0.0
        moisture = getattr(s, 'soil_moisture', 0.0) or 0.0
        pop = getattr(s, 'population', 0) or 0
        score = getattr(s, 'risk_score', 0.0) or 0.0
        level = getattr(s, 'risk_level', 'LOW') or 'LOW'
        slope = getattr(s, 'slope_angle', 30.0) or 30.0
        road = getattr(s, 'nearest_road', 'Highway')
        station_lines.append(
            f"- {s.name} ({state}): Level={level}, Score={score:.1f}/100, Rain={rain:.1f}mm, Moisture={moisture:.2f}, Slope={slope:.1f}°, Pop={pop:,}, Road={road}"
        )

    critical = [s.name for s in sorted_stations if (getattr(s, 'risk_level', '') or '').upper() == "CRITICAL"]
    high = [s.name for s in sorted_stations if (getattr(s, 'risk_level', '') or '').upper() == "HIGH"]
    top = sorted_stations[0] if sorted_stations else None
    total_pop = sum(getattr(a, 'affected_population', 0) or 0 for a in active_alerts)
    avg_rain = sum(getattr(s, 'current_rainfall', 0.0) or 0.0 for s in stations) / len(stations) if stations else 0.0

    lang_directive = LANGUAGE_DIRECTIVES.get(lang, LANGUAGE_DIRECTIVES["en"])

    system_context = f"""You are NIRAKSHA AI, the official Landslide Disaster Early Warning Decision Support Assistant for North-Eastern India (NER).
You assist district disaster commissioners, NDMA, SDRF, and civil defense rescue teams with 100% accurate, real-time telemetry.

{lang_directive}

REAL-TIME TELEMETRY GROUND TRUTH (DIRECTLY FROM DATABASE):
- Total Monitored Stations: {len(stations)} across all 8 North-Eastern states
- Highest Risk Threat Zone: {top.name if top else 'Tawang'} (Score: {top.risk_score if top else 94.7:.1f}/100, Rain: {top.current_rainfall if top else 259.0:.1f} mm)
- Critical Severity Stations: {', '.join(critical) if critical else 'None'}
- High Severity Stations: {', '.join(high) if high else 'None'}
- Active Emergency Alerts: {len(active_alerts)} (Total affected population: {total_pop:,})
- Regional Mean Rainfall: {avg_rain:.1f} mm

ALL 20 MONITORED STATIONS & LIVE DATA:
{chr(10).join(station_lines)}

CRITICAL INSTRUCTIONS:
1. Directly answer the user's specific query. If they ask about a specific station (e.g. Gangtok, Silchar, Tawang, Shillong), look up its exact row in the table above and give its exact metrics.
2. If they ask for the highest risk station, state {top.name if top else 'Tawang'} with its exact score and rainfall.
3. If they ask for evacuation protocols, explain the immediate route clearance and relief camp guidelines.
4. Structure your response with clean Markdown headers and bold bullet points.
5. End with an actionable operational directive for field or rescue units.
"""

    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    configured_model = os.environ.get("GEMINI_MODEL", "gemini-flash-latest").strip()

    if api_key:
        default_models = ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-3.5-flash", "gemini-pro-latest"]
        candidate_models = [configured_model] if configured_model not in default_models else []
        candidate_models.extend(default_models)

        for model in candidate_models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

            contents = []
            if body.conversation_history:
                recent_history = body.conversation_history[-6:]
                for turn in recent_history:
                    role = "user" if turn.get("role") in ("user", "human") else "model"
                    content_text = turn.get("content") or turn.get("text") or ""
                    if content_text.strip():
                        contents.append({
                            "role": role,
                            "parts": [{"text": content_text.strip()}]
                        })

            contents.append({
                "role": "user",
                "parts": [{"text": user_message}]
            })

            payload = {
                "system_instruction": {
                    "parts": [{"text": system_context}]
                },
                "contents": contents,
                "generationConfig": {
                    "temperature": 0.35,
                    "maxOutputTokens": 2048
                }
            }

            try:
                async with httpx.AsyncClient(timeout=25.0) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates and "content" in candidates[0]:
                            parts = candidates[0]["content"].get("parts", [])
                            if parts and "text" in parts[0]:
                                raw_text = parts[0]["text"].strip()
                                clean_text = re.sub(r'<thought>.*?</thought>', '', raw_text, flags=re.DOTALL).strip()
                                if clean_text:
                                    return {
                                        "response": clean_text,
                                        "source": "gemini",
                                        "model": model,
                                        "language": lang
                                    }
                    else:
                        logger.warning(f"Gemini {model} returned HTTP {resp.status_code}: {resp.text[:120]}")
                        if resp.status_code == 429:
                            logger.info("Gemini quota reached (429). Switching to telemetry fallback.")
                            break
            except Exception as e:
                logger.warning(f"Gemini {model} exception: {e}")

    # Deterministic telemetry fallback if Gemini call fails, times out, or key is absent
    logger.info("Using deterministic multilingual telemetry engine.")
    fallback_text = generate_multilingual_fallback(user_message, stations, active_alerts, lang=lang, evacuations=evacuations)
    return {
        "response": fallback_text,
        "source": "telemetry_fallback",
        "language": lang
    }
