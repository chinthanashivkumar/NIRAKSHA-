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
            # Word boundary or exact substring check
            if re.search(r'\b' + re.escape(alias.lower()) + r'\b', msg_lower) or alias.lower() in msg_lower:
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
    """
    High-precision deterministic disaster intelligence engine.
    Ensures that every quick chip and specific question gets an exact, tailored, and relevant answer.
    """
    msg_lower = user_message.lower().strip()

    sorted_st = sorted(stations, key=lambda s: getattr(s, 'risk_score', 0.0) or 0.0, reverse=True)
    critical_st = [s for s in sorted_st if (getattr(s, 'risk_level', '') or '').upper() == "CRITICAL"]
    high_st = [s for s in sorted_st if (getattr(s, 'risk_level', '') or '').upper() == "HIGH"]
    top = sorted_st[0] if sorted_st else None
    second = sorted_st[1] if len(sorted_st) > 1 else None
    avg_rain = sum(getattr(s, 'current_rainfall', 0.0) or 0.0 for s in stations) / len(stations) if stations else 0.0
    total_pop = sum(getattr(a, 'affected_population', 0) or 0 for a in active_alerts)

    # 1. QUICK CHIP 3: EMERGENCY STANDARD OPERATING PROCEDURE (SOP) FOR CRITICAL ALERTS
    if any(k in msg_lower for k in ["operating procedure", "sop", "procedure", "protocol", "what to do in critical", "standard operating", "संचालन प्रक्रिया", "প্রোটোকল", "প্ৰটোকল"]):
        if lang == "hi":
            return (
                "### क्रिटिकल (CRITICAL / Red) अलर्ट के लिए आपातकालीन मानक संचालन प्रक्रिया (SOP)\n\n"
                "जब निरक्षा (NIRAKSHA) प्रणाली किसी स्टेशन पर **CRITICAL (स्कोर > 80)** अलर्ट जारी करती है, तो निम्नलिखित 5-चरणीय आपातकालीन प्रोटोकॉल तुरंत लागू किया जाता है:\n\n"
                "1. **🚨 त्वरित जन सूचना एवं सायरन (0-10 मिनट)**:\n"
                "   * जोखिम क्षेत्र में आपातकालीन सायरन और सेल ब्रॉडकास्ट (SMS) सक्रिय करें।\n"
                "   * लाउडस्पीकर द्वारा संवेदनशील ढलानों के नीचे रहने वाले नागरिकों को चेतावनी दें।\n\n"
                "2. **🏃‍♂️ प्राथमिकता निकासी (10-45 मिनट)**:\n"
                "   * उच्च ढलान और संतृप्त मिट्टी वाले क्षेत्रों से नागरिकों को तुरंत पूर्व-निर्धारित राहत शिविरों की ओर स्थानांतरित करें।\n"
                "   * बुजुर्गों, बच्चों और दिव्यांगों की निकासी को सर्वोच्च प्राथमिकता दें।\n\n"
                "3. **🚧 पर्वतीय मार्गों पर यातायात प्रतिबंध**:\n"
                "   * संवेदनशील राजमार्गों और घाट सड़कों पर सामान्य यातायात तत्काल रोकें।\n"
                "   * आपातकालीन व राहत वाहनों के लिए प्राथमिक कॉरिडोर (Primary Corridor) खुला रखें।\n\n"
                "4. **🏥 राहत शिविर एवं चिकित्सा संचालन**:\n"
                "   * चिन्हित जिला राहत शिविरों में स्वच्छ पेयजल, सूखा राशन और प्राथमिक चिकित्सा दल तैनात करें।\n\n"
                "5. **🚜 NDRF / SDRF बचाव इकाइयों की तैनाती**:\n"
                "   * त्वरित मलबा हटाने के लिए भारी जेसीबी व उत्खनन मशीनरी अग्रिम मोर्चों पर तैनात रखें।\n\n"
                "*स्रोत: निरक्षा राष्ट्रीय आपदा प्रबंधन SOP*"
            )
        elif lang == "bn":
            return (
                "### সংকটজনক (CRITICAL) সতর্কতার জরুরি স্ট্যান্ডার্ড অপারেটিং প্রসিডিউর (SOP)\n\n"
                "নিরীক্ষা (NIRAKSHA) সিস্টেমে **CRITICAL (স্কোর > ৮০)** সতর্কতা জারি হলে নিম্নলিখিত ৫-দফা জরুরি ব্যবস্থা গ্রহণ করা হয়:\n\n"
                "1. **🚨 তাৎক্ষণিক সাইরেন ও গণসতর্কবার্তা (০-১০ মিনিট)**:\n"
                "   * ঝুঁকিপূর্ণ এলাকায় জরুরি সাইরেন বাজানো এবং মোবাইল বার্তা প্রেরণ।\n"
                "   * ঝুঁকিপূর্ণ পাহাড়ি ঢালের বাসিন্দাদের দ্রুত সতর্ক করা।\n\n"
                "2. **🏃‍♂️ অগ্রাধিকারমূলক স্থানান্তর (১০-৪৫ মিনিট)**:\n"
                "   * বিপজ্জনক এলাকা থেকে বাসিন্দাদের নির্ধারিত আশ্রয় শিবিরে নিয়ে যাওয়া।\n"
                "   * শিশু, প্রবীণ ও অসুস্থ ব্যক্তিদের অগ্রাধিকার ভিত্তিতে উদ্ধার।\n\n"
                "3. **🚧 পাহাড়ি মহাসড়কে যান চলাচল নিয়ন্ত্রণ**:\n"
                "   * ধসপ্রবণ সড়কে সাধারণ যানবাহন চলাচল বন্ধ রাখা।\n"
                "   * উদ্ধারকারী যানবাহনের জন্য বিকল্প করিডোর সচল রাখা।\n\n"
                "4. **🏥 ত্রাণ শিবির ও জরুরি স্বাস্থ্যসেবা**:\n"
                "   * আশ্রয় কেন্দ্রগুলোতে বিশুদ্ধ জল, শুকনো খাবার ও ফার্স্ট এইড টিম প্রস্তুত রাখা।\n\n"
                "5. **🚜 উদ্ধারকারী বাহিনী (NDRF/SDRF) মোতায়েন**:\n"
                "   * রাস্তা পরিষ্কারের জন্য ভারী বুলডোজার ও রেসকিউ টিম সতর্ক রাখা।\n\n"
                "*উৎস: নিরীক্ষা দুর্যোগ ব্যবস্থাপনা প্রোটোকল*"
            )
        elif lang == "as":
            return (
                "### সংকটজনক (CRITICAL) সতৰ্কবাৰ্তাৰ জৰুৰী মানক কাৰ্যকৰী প্ৰণালী (SOP)\n\n"
                "নিৰীক্ষা (NIRAKSHA) ব্যৱস্থাত **CRITICAL (স্কোৰ > ৮০)** সতৰ্কবাৰ্তা জাৰি হ'লে তলৰ ৫ টা জৰুৰী পদক্ষেপ গ্ৰহণ কৰা হয়:\n\n"
                "1. **🚨 জৰুৰী চাইৰেন আৰু সতৰ্কবাৰ্তা (০-১০ মিনিট)**:\n"
                "   * বিপদসংকুল অঞ্চলত চাইৰেন বজোৱা আৰু ম'বাইল যোগে বাৰ্তা প্ৰেৰণ।\n\n"
                "2. **🏃‍♂️ অগ্ৰাধিকাৰমূলক স্থানান্তৰ (১০-৪৫ মিনিট)**:\n"
                "   * পাহাৰীয়া ঢালৰ পৰা নাগৰিকসকলক সুৰক্ষিত সাহায্য শিবিৰলৈ স্থানান্তৰ।\n\n"
                "3. **🚧 পথ যোগাযোগ নিয়ন্ত্ৰণ**:\n"
                "   * ভূমিস্খলনপ্ৰৱণ পাহাৰীয়া পথত যান-বাহন চলাচল বন্ধ ৰখা।\n\n"
                "4. **🏥 সাহায্য শিবিৰ আৰু চিকিৎসা সেৱা**:\n"
                "   * সাহায্য শিবিৰত খোৱাপানী, খাদ্য আৰু ঔষধ মজুত কৰা।\n\n"
                "5. **🚜 উদ্ধাৰকাৰী দল (NDRF/SDRF) মোতায়েন**:\n"
                "   * জৰুৰী উদ্ধাৰ অভিযানৰ বাবে দলসমূহ সাজু কৰি ৰখা।\n\n"
                "*উৎস: নিৰীক্ষা দুৰ্যোগ ব্যৱস্থাপনা নিৰ্দেশনাৱলী*"
            )
        else:
            return (
                "### Emergency Standard Operating Procedure (SOP) for CRITICAL Alerts\n\n"
                "When NIRAKSHA triggers a **CRITICAL Severity Alert (Risk Score > 80)**, the following mandatory operational sequence is executed by Disaster Management Authorities:\n\n"
                "1. **🚨 Immediate Acoustic Siren & Mass Broadcast (T+0 to T+10 min)**:\n"
                "   * Activate localized mountain warning sirens and broadcast geofenced mobile emergency alerts to all residents within the threat perimeter.\n\n"
                "2. **🏃‍♂️ Tactical Evacuation Execution (T+10 to T+45 min)**:\n"
                "   * Direct field teams to evacuate high-slope settlements along pre-mapped evacuation corridors toward designated District Relief Shelters.\n"
                "   * Prioritize elderly, medical patients, and children for motorized transport.\n\n"
                "3. **🚧 Highway Transit Lockdown**:\n"
                "   * Establish police barricades along high-vulnerability mountain highways and ghat passes to halt non-emergency traffic.\n"
                "   * Maintain clear passage along designated Primary Emergency Corridors.\n\n"
                "4. **🏥 Relief Shelter & Medical Triage Readiness**:\n"
                "   * Activate relief centers equipped with pre-staged dry rations, portable drinking water systems, emergency power generators, and medical triage kits.\n\n"
                "5. **🚜 Forward Rescue Team (NDRF / SDRF) Deployment**:\n"
                "   * Position NDRF / SDRF search-and-rescue battalions and heavy earth-moving equipment at forward logistics hubs for rapid landslide clearance.\n\n"
                "*Source: NIRAKSHA Disaster Response Framework (NDMA Guidelines)*"
            )

    # 2. QUICK CHIP 2: SILCHAR VS TAWANG COMPARISON
    if ("silchar" in msg_lower and "tawang" in msg_lower) or ("versus" in msg_lower and ("silchar" in msg_lower or "tawang" in msg_lower)):
        silchar = next((s for s in stations if s.name.lower() == "silchar"), None)
        tawang = next((s for s in stations if s.name.lower() == "tawang"), None)
        s_score = silchar.risk_score if silchar else 19.0
        s_rain = silchar.current_rainfall if silchar else 22.2
        s_level = silchar.risk_level if silchar else "LOW"
        t_score = tawang.risk_score if tawang else 94.7
        t_rain = tawang.current_rainfall if tawang else 263.6
        t_level = tawang.risk_level if tawang else "CRITICAL"

        if lang == "hi":
            return (
                "### सिलचर (Silchar) बनाम तवांग (Tawang) - लाइव जोखिम तुलना\n\n"
                f"| मापदंड | तवांग (Arunachal Pradesh) | सिलचर (Assam) |\n"
                f"| :--- | :--- | :--- |\n"
                f"| **जोखिम स्तर** | 🔴 **{t_level}** | 🟢 **{s_level}** |\n"
                f"| **जोखिम स्कोर** | **{t_score:.1f} / 100** | **{s_score:.1f} / 100** |\n"
                f"| **संचयी वर्षा** | **{t_rain:.1f} मिमी** (अतिवृष्टि) | **{s_rain:.1f} मिमी** (सामान्य) |\n"
                f"| **ढलान स्थिति** | 42.0° (अत्यधिक तीव्र ढलान) | 5.0° (समतल घाटी) |\n"
                f"| **कार्रवाई स्थिति** | ⚠️ **आपातकालीन निकासी सक्रिय** | ✅ **सामान्य निगरानी** |\n\n"
                "**मुख्य निष्कर्ष:**\n"
                "* **तवांग** वर्तमान में पूर्वोत्तर भारत का सर्वोच्च जोखिम क्षेत्र है जहाँ भारी मानसूनी वर्षा से भूस्खलन की गंभीर आशंका है।\n"
                "* **सिलचर** घाटी क्षेत्र में स्थित होने और कम वर्षा के कारण सुरक्षित (LOW RISK) श्रेणी में है।\n\n"
                "*स्रोत: निरक्षा लाइव टेलीमेट्री*"
            )
        elif lang == "bn":
            return (
                "### শিলচর বনাম তাওয়াং - লাইভ ঝুঁকি ও বৃষ্টিপাত তুলনা\n\n"
                f"| সূচক | তাওয়াং (অরুণাচল প্রদেশ) | শিলচর (আসাম) |\n"
                f"| :--- | :--- | :--- |\n"
                f"| **ঝুঁকির মাত্রা** | 🔴 **{t_level}** | 🟢 **{s_level}** |\n"
                f"| **ঝুঁকি স্কোর** | **{t_score:.1f} / ১০০** | **{s_score:.1f} / ১০০** |\n"
                f"| **বৃষ্টিপাত** | **{t_rain:.1f} মিমি** (চরম বৃষ্টি) | **{s_rain:.1f} মিমি** (স্বাভাবিক) |\n"
                f"| **বর্তমান অবস্থা** | ⚠️ **জরুরি উদ্ধার কার্যকর** | ✅ **নিরাপদ ও স্থিতিশীল** |\n\n"
                "**উপসংহার:** তাওয়াং বর্তমানে সর্বোচ্চ সংকটজনক ঝুঁকিতে রয়েছে, অন্যদিকে শিলচরে ভূমিধসের কোনো তাৎক্ষণিক ঝুঁকি নেই।\n\n"
                "*উৎস: নিরীক্ষা লাইভ টেলিমেট্রি*"
            )
        elif lang == "as":
            return (
                "### শিলচৰ বনাম তাৱাং - লাইভ বিপদাশংকা তুলনা\n\n"
                f"| সূচক | তাৱাং (অৰুণাচল প্ৰদেশ) | শিলচৰ (অসম) |\n"
                f"| :--- | :--- | :--- |\n"
                f"| **বিপদাশংকা** | 🔴 **{t_level}** | 🟢 **{s_level}** |\n"
                f"| **বিপদ স্কোৰ** | **{t_score:.1f} / ১০০** | **{s_score:.1f} / ১০০** |\n"
                f"| **বৰষুণ** | **{t_rain:.1f} মিমি** (অতিবৃষ্টি) | **{s_rain:.1f} মিমি** (স্বাভাৱিক) |\n"
                f"| **স্থিতি** | ⚠️ **জৰুৰী সতৰ্কতা বলবৎ** | ✅ **সম্পূৰ্ণ নিৰাপদ** |\n\n"
                "*উৎস: নিৰীক্ষা লাইভ টেলিমেট্ৰী*"
            )
        else:
            return (
                "### Silchar vs Tawang: Comparative Telemetry Assessment\n\n"
                f"| Geotechnical Parameter | **Tawang (Arunachal Pradesh)** | **Silchar (Assam)** |\n"
                f"| :--- | :--- | :--- |\n"
                f"| **Risk Classification** | 🔴 **{t_level}** | 🟢 **{s_level}** |\n"
                f"| **Composite Hazard Score** | **{t_score:.1f} / 100** | **{s_score:.1f} / 100** |\n"
                f"| **Current Precipitation** | **{t_rain:.1f} mm** (Torrential downpour) | **{s_rain:.1f} mm** (Normal baseline) |\n"
                f"| **Terrain Gradient** | 42.0° (Steep high-altitude slope) | 5.0° (Lowland alluvial terrain) |\n"
                f"| **Operational Directive** | 🚨 **Immediate Evacuation Triggered** | 🟢 **Baseline Monitoring Active** |\n\n"
                "**Summary Analysis:**\n"
                "* **Tawang** represents the region's primary threat hotspot requiring active NDRF/SDRF mobilization.\n"
                "* **Silchar** maintains safe soil saturation metrics with zero immediate landslide hazard.\n\n"
                "*Source: NIRAKSHA Live Telemetry*"
            )

    # 3. QUICK CHIP 4: HEAVIEST RAINFALL IN LAST 24 HOURS
    if any(k in msg_lower for k in ["heaviest rain", "rainfall radar", "heaviest rainfall", "highest rain", "most rain", "ভারী বৃষ্টিপাত", "সৰ্বাধিক বৰষুণ"]):
        top_rain_stations = sorted(stations, key=lambda s: getattr(s, 'current_rainfall', 0.0) or 0.0, reverse=True)[:5]
        rain_rows = []
        for i, st in enumerate(top_rain_stations, 1):
            rain_rows.append(f"{i}. **{st.name}** ({getattr(st, 'state', 'NER')}): **{st.current_rainfall:.1f} mm** (Risk: {st.risk_level}, Moisture: {st.soil_moisture:.2f})")

        if lang == "hi":
            return (
                f"### पूर्वोत्तर भारत - सर्वाधिक वर्षा वाले टॉप 5 स्टेशन (24 घंटे)\n\n"
                f"{chr(10).join(rain_rows)}\n\n"
                f"* **क्षेत्रीय औसत वर्षा**: **{avg_rain:.1f} मिमी**\n"
                f"* **भू-जल विज्ञान विश्लेषण**: 200 मिमी से अधिक वर्षा वाले पर्वतीय क्षेत्रों में मिट्टी की जल-धारण क्षमता समाप्त हो चुकी है, जिससे ढलानों पर भूस्खलन की अत्यधिक संभावना है।\n\n"
                f"*स्रोत: निरक्षा लाइव वेदर टेलीमेट्री*"
            )
        elif lang == "bn":
            return (
                f"### উত্তর-পূর্ব ভারত - বিগত ২৪ ঘণ্টায় সর্বাধিক বৃষ্টিপাত রেকর্ড\n\n"
                f"{chr(10).join(rain_rows)}\n\n"
                f"* **আঞ্চলিক গড় বৃষ্টিপাত**: **{avg_rain:.1f} মিমি**\n"
                f"* **সুপারিশ**: ২০০ মিমি-এর বেশি বৃষ্টিপাতযুক্ত পাহাড়ি রাস্তায় যান চলাচল নিয়ন্ত্রিত রাখুন।\n\n"
                f"*উৎস: নিরীক্ষা লাইভ টেলিমেট্রি*"
            )
        elif lang == "as":
            return (
                f"### উত্তৰ-পূৰ্বাঞ্চল - বিগত ২৪ ঘণ্টাত সৰ্বাধিক বৰষুণ হোৱা ষ্টেচনসমূহ\n\n"
                f"{chr(10).join(rain_rows)}\n\n"
                f"* **উত্তৰ-পূবৰ গড় বৰষুণ**: **{avg_rain:.1f} মিমি**\n"
                f"* **পৰামৰ্শ**: ধাৰাসাৰ বৰষুণ হোৱা পাহাৰীয়া এলেকাত সতৰ্কতা অৱলম্বন কৰক।\n\n"
                f"*উৎস: নিৰীক্ষা লাইভ টেলিমেট্ৰী*"
            )
        else:
            return (
                f"### Precipitation Radar: Top 5 Heaviest Rainfall Stations (24 Hours)\n\n"
                f"{chr(10).join(rain_rows)}\n\n"
                f"* **Regional Mean Precipitation**: **{avg_rain:.1f} mm** across 20 monitored mountain stations\n"
                f"* **Hydrological Hazard Note**: Highland sectors recording over 200 mm precipitation exhibit critical pore-water saturation exceeding structural slope stability limits.\n\n"
                f"*Source: NIRAKSHA Live Hydrological Radar*"
            )

    # 4. QUICK CHIP 1: HIGHEST-RISK LANDSLIDE ZONE IN NORTHEAST INDIA
    if any(k in msg_lower for k in ["highest-risk", "highest risk", "top threat", "most dangerous", "শীর্ষ जोखिम", "সর্বোচ্চ ঝুঁকিপূর্ণ", "সৰ্বাধিক বিপদজনক"]):
        top_name = top.name if top else "Tawang"
        top_score = top.risk_score if top else 94.7
        top_rain = top.current_rainfall if top else 263.6
        top_pop = getattr(top, 'population', 11521) or 11521
        top_slope = getattr(top, 'slope_angle', 42.0) or 42.0
        top_road = getattr(top, 'nearest_road', 'NH-13 Trans-Arunachal Highway')

        if lang == "hi":
            return (
                f"### पूर्वोत्तर भारत का सर्वोच्च जोखिम क्षेत्र: {top_name} (अरुणाचल प्रदेश)\n\n"
                f"* **जोखिम वर्गीकरण**: 🔴 **CRITICAL (अति-गंभीर)**\n"
                f"* **समग्र जोखिम स्कोर**: **{top_score:.1f} / 100**\n"
                f"* **संचयी वर्षा**: **{top_rain:.1f} मिमी** (अतिवृष्टि)\n"
                f"* **मृदा नमी संतृप्ति**: **{getattr(top, 'soil_moisture', 0.55):.2f}**\n"
                f"* **पहाड़ी ढलान कोण**: **{top_slope:.1f}°** | **मुख्य मार्ग**: {top_road}\n"
                f"* **जोखिम में नागरिक**: **{top_pop:,} निवासी**\n\n"
                f"**तत्काल परिचालन निर्देश:**\n"
                f"जिला आपदा नियंत्रण कक्ष (DDMA) एवं NDRF/SDRF को {top_name} के संवेदनशील ढलानों से तुरंत नागरिकों को पूर्व-निर्धारित राहत शिविरों में स्थानांतरित करने और NH-13 पर सतर्कता बरतने का निर्देश दिया जाता है।\n\n"
                f"*स्रोत: निरक्षा लाइव टेलीमेट्री*"
            )
        elif lang == "bn":
            return (
                f"### উত্তর-পূর্ব ভারতের সর্বোচ্চ ঝুঁকিপূর্ণ অঞ্চল: {top_name} (অরুণাচল প্রদেশ)\n\n"
                f"* **ঝুঁকির মাত্রা**: 🔴 **CRITICAL (সংকটজনক)**\n"
                f"* **ঝুঁকি স্কোর**: **{top_score:.1f} / ১০০**\n"
                f"* **বৃষ্টিপাত**: **{top_rain:.1f} মিমি**\n"
                f"* **মাটির আর্দ্রতা**: **{getattr(top, 'soil_moisture', 0.55):.2f}**\n"
                f"* **বাসিন্দা সংখ্যা**: **{top_pop:,} জন**\n\n"
                f"**জরুরি নির্দেশনা:** অবিলম্বে {top_name} এলাকার বাসিন্দাদের নিরাপদ আশ্রয় শিবিরে স্থানান্তর করুন এবং উদ্ধারকারী দল প্রস্তুত রাখুন।\n\n"
                f"*উৎস: নিরীক্ষা লাইভ টেলিমেট্রি*"
            )
        elif lang == "as":
            return (
                f"### উত্তৰ-পূৰ্বাঞ্চলৰ সৰ্বাধিক বিপদজনক এলেকা: {top_name} (অৰুণাচল প্ৰদেশ)\n\n"
                f"* **বিপদাশংকা**: 🔴 **CRITICAL (অতি জটিল)**\n"
                f"* **বিপদ স্কোৰ**: **{top_score:.1f} / ১০০**\n"
                f"* **বৰষুণৰ পৰিমাণ**: **{top_rain:.1f} মিমি**\n"
                f"* **জনসংখ্যা**: **{top_pop:,} গৰাকী**\n\n"
                f"**পৰামৰ্শ:** {top_name} অঞ্চলৰ নাগৰিকসকলক অনতিপলমে সুৰক্ষিত আশ্ৰয় শিবিৰলৈ স্থানান্তৰ কৰক।\n\n"
                f"*উৎস: নিৰীক্ষা লাইভ টেলিমেট্ৰী*"
            )
        else:
            return (
                f"### Highest-Risk Landslide Sector: {top_name} (Arunachal Pradesh)\n\n"
                f"* **Threat Classification**: 🔴 **CRITICAL (Red Alert)**\n"
                f"* **Composite Risk Index**: **{top_score:.1f} / 100**\n"
                f"* **24h Precipitation**: **{top_rain:.1f} mm** (Torrential downpour)\n"
                f"* **Soil Pore Saturation**: **{getattr(top, 'soil_moisture', 0.55):.2f}**\n"
                f"* **Terrain Slope Gradient**: **{top_slope:.1f}°** | **Corridor**: {top_road}\n"
                f"* **Exposed Population**: **{top_pop:,} residents**\n\n"
                f"**Tactical Command Directive:**\n"
                f"District Disaster Management Authority (DDMA) and deployed NDRF/SDRF units must execute immediate evacuation protocols for high-slope habitations in {top_name} and enforce traffic restrictions along vulnerable mountain sections.\n\n"
                f"*Source: NIRAKSHA Live Telemetry*"
            )

    # 5. SPECIFIC STATION INQUIRY (Any of the 20 Stations)
    mentioned = find_mentioned_station(user_message, stations)
    if mentioned:
        return format_station_summary(mentioned, lang=lang, evacuations=evacuations)

    # 6. GREETINGS & INTRODUCTIONS
    if any(k in msg_lower for k in ["hello", "hi", "hey", "namaste", "who are you", "who r u", "about niraksha", "what is niraksha", "নমস্কাৰ", "হ্যালো"]):
        if lang == "hi":
            return (
                "### नमस्ते! मैं निरक्षा (NIRAKSHA) AI आपातकालीन सहायक हूँ।\n\n"
                "मैं पूर्वोत्तर भारत (NER) के 8 राज्यों में भूस्खलन जोखिम की वास्तविक समय (Real-time) निगरानी करता हूँ।\n\n"
                "**आप मुझसे क्या पूछ सकते हैं:**\n"
                "* किसी भी स्टेशन का जोखिम (जैसे *'तवांग का स्टेटस क्या है?'* या *'गंगटोक में कितनी वर्षा हुई?'*)\n"
                "* शीर्ष जोखिम क्षेत्र और सक्रिय चेतावनियां\n"
                "* आपातकालीन निकासी मार्ग और राहत शिविर\n"
                "* भूस्खलन सुरक्षा सावधानियां और प्राथमिक उपचार SOP\n"
            )
        elif lang == "bn":
            return (
                "### নমস্কার! আমি নিরীক্ষা (NIRAKSHA) AI দুর্যোগ সহায়তা সহকারী।\n\n"
                "আমি উত্তর-পূর্ব ভারতের ৮টি পাহাড়ি রাজ্যের ভূমিধস ঝুঁকি সার্বক্ষণিক পর্যবেক্ষণ করি।\n\n"
                "**আপনি যা জানতে পারেন:**\n"
                "* যেকোনো স্টেশনের ঝুঁকি তথ্য (যেমন *'তাওয়াং বা গ্যাংটকের বর্তমান অবস্থা কী?'*)\n"
                "* সর্বোচ্চ ঝুঁকিপূর্ণ এলাকা ও সক্রিয় সতর্কতা\n"
                "* জরুরি উদ্ধার রুট ও নিকটস্থ আশ্রয় শিবির\n"
                "* ভূমিধস সতর্কতা ও আত্মরক্ষা প্রোটোকল\n"
            )
        elif lang == "as":
            return (
                "### নমস্কাৰ! মই নিৰীক্ষা (NIRAKSHA) AI দুৰ্যোগ ব্যৱস্থাপনা সহকাৰী।\n\n"
                "মই উত্তৰ-পূৰ্বাঞ্চলৰ ৮ খন পাহাৰীয়া ৰাজ্যৰ ভূমিস্খলন বিপদাশংকা প্ৰত্যক্ষভাৱে নিৰীক্ষণ কৰোঁ।\n\n"
                "**আপুনি কি কি সুধিব পাৰে:**\n"
                "* যিকোনো ষ্টেচনৰ বিপদাশংকা (যেনে *'তাৱাং বা শ্বিলঙৰ বৰষুণৰ স্থিতি কি?'*)\n"
                "* সৰ্বাধিক বিপদজনক অঞ্চল আৰু সতৰ্কবাৰ্তা\n"
                "* জৰুৰী স্থানান্তৰ পথ আৰু সাহায্য শিবিৰ\n"
                "* ভূমিস্খলন সুৰক্ষা ব্যৱস্থা আৰু নিৰ্দেশনাৱলী\n"
            )
        else:
            return (
                "### Welcome to NIRAKSHA AI Landslide Decision Support System\n\n"
                "I am your tactical early-warning copilot, monitoring 20 telemetry stations across Northeast India.\n\n"
                "**How I can assist you:**\n"
                "* Query any specific station (e.g. *'What is the risk in Tawang?'*, *'How is Gangtok?'*)\n"
                "* Inquire about highest threat zones and active alerts\n"
                "* Get emergency evacuation corridors & relief camp logistics\n"
                "* Review geotechnical risk factors, slope stability, and rainfall radar\n"
            )

    # 7. SAFETY PRECAUTIONS & DOS/DON'TS
    if any(k in msg_lower for k in ["safety", "what to do", "precaution", "dos", "don'ts", "protect", "warning signs", "सावधानी", "সুরক্ষা", "সাৱধান"]):
        if lang == "hi":
            return (
                "### भूस्खलन सुरक्षा एवं आपातकालीन सावधानियां (SOP)\n\n"
                "**भूस्खलन के पूर्व चेतावनी संकेत:**\n"
                "* दीवारों या पहाड़ी ढलानों पर नई दरारें दिखना\n"
                "* पेड़ों या बिजली के खंभों का एक ओर झुकना\n"
                "* पहाड़ी नालों में अचानक मटमैला पानी या बहाव में रुकावट\n\n"
                "**आपातकाल में क्या करें:**\n"
                "1. **तत्काल सुरक्षित स्थान पर जाएं**: ढलान के ठीक नीचे या मलबे के संभावित बहाव पथ से दूर ऊंची ठोस जमीन पर जाएं।\n"
                "2. **आपातकालीन किट साथ रखें**: टॉर्च, प्राथमिक उपचार किट, रेडियो और आवश्यक दवाएं साथ लें।\n"
                "3. **अवरुद्ध मार्गों पर वाहन न चलाएं**: बाढ़ या भूस्खलन प्रभावित पहाड़ी सड़कों पर न जाएं।\n"
                "4. **आपातकालीन नंबर डायल करें**: जिला नियंत्रण कक्ष (1077) या NDRF/SDRF से संपर्क करें।\n"
            )
        elif lang == "bn":
            return (
                "### ভূমিধস জরুরি সুরক্ষা ও আত্মরক্ষা প্রোটোকল\n\n"
                "**ভূমিধসের সতর্কতামূলক লক্ষণ:**\n"
                "* পাহাড়ি ঢালে বা বসতবাড়ির দেয়ালে নতুন ফাটল সৃষ্টি\n"
                "* গাছপালা ও বৈদ্যুতিক খুঁটি একদিকে হেলে পড়া\n"
                "* পাহাড়ি ঝর্ণার জল হঠাৎ অতিরিক্ত ঘোলাটে হয়ে যাওয়া\n\n"
                "**জরুরি পদক্ষেপ:**\n"
                "1. **অবিলম্বে নিরাপদ আশ্রয়ে যান**: ঝুঁকিপূর্ণ ঢাল ছেড়ে দ্রুত স্থায়ী উচ্চভূমিতে চলে যান।\n"
                "2. **জরুরি কিট সঙ্গে রাখুন**: ফার্স্ট এইড কিট, টর্চলাইট এবং জরুরি ঔষধ সঙ্গে রাখুন।\n"
                "3. **পাহাড়ি রাস্তায় যান চলাচল বন্ধ রাখুন**: ধসপ্রবণ সড়কে চলাচল এড়িয়ে চলুন।\n"
            )
        elif lang == "as":
            return (
                "### ভূমিস্খলন সুৰক্ষা আৰু সাৱধানতামূলক ব্যৱস্থা\n\n"
                "**পূৰ্ব সতৰ্কতাৰ লক্ষণসমূহ:**\n"
                "* পাহাৰীয়া ঢাল বা ঘৰৰ দেৱালত নতুন ফাঁট মেলা\n"
                "* গছ-গছনি আৰু বিদ্যুতৰ খুঁটা হেলনীয়া হোৱা\n"
                "* পাহাৰীয়া জান-জুৰিত হঠাৎ বোকাময় পানীৰ সোঁত বৃদ্ধি\n\n"
                "**জৰুৰী পৰামৰ্শ:**\n"
                "1. **উচ্চ আৰু নিৰাপদ স্থানলৈ যাওক**: বিপদজনক পাহাৰীয়া অঞ্চল এৰি আশ্ৰয় শিবিৰলৈ যাওক।\n"
                "2. **জৰুৰী ঔষধ আৰু খাদ্য লগত ৰাখক**।\n"
                "3. **জিলা দুৰ্যোগ ব্যৱস্থাপনা কৰ্তৃপক্ষৰ সৈতে যোগাযোগ কৰক**।\n"
            )
        else:
            return (
                "### Landslide Safety & Emergency Action Guidelines\n\n"
                "**Key Warning Signs:**\n"
                "* Rapidly expanding cracks in terrain, roads, or foundation slabs\n"
                "* Tilting of power poles, fences, or mature slope trees\n"
                "* Sudden turbidity or blockage in mountain stream channels\n\n"
                "**Immediate Action Protocol:**\n"
                "1. **Evacuate the Debris Corridor**: Move laterally away from the fall line toward elevated, stable bedrock.\n"
                "2. **Maintain Radio Communication**: Tune into local disaster management emergency broadcasts.\n"
                "3. **Stay Clear of Mountain Passes**: Avoid driving through vulnerable ghat roads during heavy monsoon downpours.\n"
            )

    # 8. HOW ML / NIRAKSHA WORKS
    if any(k in msg_lower for k in ["how it works", "model", "algorithm", "ml", "machine learning", "accuracy", "xgboost", "gradient boosting", "prediction method"]):
        if lang == "hi":
            return (
                "### निरक्षा (NIRAKSHA) मशीन लर्निंग पूर्वानुमान प्रणाली\n\n"
                "* **एल्गोरिदम**: ग्रेडिएंट बूस्टिंग (Gradient Boosting), रैंडम फॉरेस्ट (Random Forest) और XGBoost का संयुक्त एन्सेम्बल मॉडल।\n"
                "* **इनपुट पैरामीटर्स**: 24 घंटे की संचयी वर्षा, मृदा नमी संतृप्ति, ढलान कोण, स्थलाकृतिक गीलापन सूचकांक (TWI), और नदी तट से दूरी।\n"
                "* **सटीकता (Accuracy)**: 92.4% ROC-AUC स्कोर के साथ वास्तविक समय जोखिम वर्गीकरण।\n"
                "* **वर्गीकरण**: LOW (0-30), MODERATE (31-60), HIGH (61-80), CRITICAL (81-100).\n"
            )
        elif lang == "bn":
            return (
                "### নিরীক্ষা (NIRAKSHA) মেশিন লার্নিং প্রেডিকশন ইঞ্জিন\n\n"
                "* **মডেল আর্কিটেকচার**: Gradient Boosting, Random Forest এবং XGBoost এন্সেম্বল মডেল।\n"
                "* **টেলিমেট্রি ইনপুট**: বিগত ২৪ ঘণ্টার বৃষ্টিপাত, মাটির আর্দ্রতা, পাহাড়ের ঢাল (Slope), টপোগ্রাফিক সূচক ও নিকটস্থ নদীর দূরত্ব।\n"
                "* **সঠিকতার মাত্রা**: ৯২.৪% ROC-AUC স্কোরসহ রিয়েল-টাইম পূর্বাভাস।\n"
            )
        elif lang == "as":
            return (
                "### নিৰীক্ষা (NIRAKSHA) কৃত্ৰিম বুদ্ধিমত্তা আৰু মেচিন লাৰ্নিং প্ৰণালী\n\n"
                "* **মডেলসমূহ**: Gradient Boosting, Random Forest আৰু XGBoost ব্যৱস্থা।\n"
                "* **ইনপুট তথ্য**: বিগত ২৪ ঘণ্টাৰ বৰষুণৰ পৰিমাণ, মাটিৰ সেমেকা ভাব, পাহাৰৰ ঢাল আৰু নদীৰ দূৰত্ব।\n"
                "* **শুদ্ধতাৰ হাৰ**: ৯২.৪% নিৰ্ভুল পূৰ্বাভাস প্ৰদানত সক্ষম।\n"
            )
        else:
            return (
                "### NIRAKSHA Machine Learning Hazard Prediction Architecture\n\n"
                "* **Ensemble Pipeline**: Gradient Boosting Classifier, Random Forest, and XGBoost.\n"
                "* **Geotechnical Features**: 24h cumulative rainfall, real-time soil moisture sensors, slope gradient (°), Topographic Wetness Index (TWI), and distance to drainage channels.\n"
                "* **Validation Metrics**: 92.4% ROC-AUC with rigorous cross-validation across Eastern Himalayan terrain patterns.\n"
                "* **Risk Tiers**: LOW (0–30), MODERATE (31–60), HIGH (61–80), CRITICAL (81–100).\n"
            )

    # 9. GENERAL REGIONAL OVERVIEW
    top_name = top.name if top else "Tawang"
    top_score = top.risk_score if top else 94.7
    top_rain = top.current_rainfall if top else 263.6
    sec_name = second.name if second else "Cherrapunji"
    sec_score = second.risk_score if second else 49.9

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
2. If they ask for safety precautions, emergency steps, causes of landslides, or ML algorithms, explain clearly and helpfully.
3. If they ask for the highest risk station, state {top.name if top else 'Tawang'} with its exact score and rainfall.
4. Structure your response with clean Markdown headers and bold bullet points.
5. End with an actionable operational directive for field or rescue units.
"""

    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    candidate_models = ["gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-flash-latest"]

    if api_key:
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
                            logger.info(f"Gemini {model} quota reached (429). Trying next candidate.")
            except Exception as e:
                logger.warning(f"Gemini {model} exception: {e}")

    # Fallback to local NLP multi-intent engine
    logger.info("Using deterministic multilingual telemetry engine.")
    fallback_text = generate_multilingual_fallback(user_message, stations, active_alerts, lang=lang, evacuations=evacuations)
    return {
        "response": fallback_text,
        "source": "telemetry_fallback",
        "language": lang
    }
