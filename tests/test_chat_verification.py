import asyncio
import sys
import os
from dotenv import load_dotenv

load_dotenv()
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routers.chat import chat, ChatMessage
from database import SessionLocal
from models import Station

async def run_verification():
    print("=" * 60)
    print("1. DATABASE GROUND TRUTH VERIFICATION")
    print("=" * 60)
    db = SessionLocal()
    st_tawang = db.query(Station).filter(Station.name == 'Tawang').first()
    st_cherra = db.query(Station).filter(Station.name == 'Cherrapunji').first()
    st_silchar = db.query(Station).filter(Station.name == 'Silchar').first()
    print(f"Tawang:      Risk={st_tawang.risk_level} ({st_tawang.risk_score:.1f}/100), Rain={st_tawang.current_rainfall:.1f}mm")
    print(f"Cherrapunji: Risk={st_cherra.risk_level} ({st_cherra.risk_score:.1f}/100), Rain={st_cherra.current_rainfall:.1f}mm")
    print(f"Silchar:     Risk={st_silchar.risk_level} ({st_silchar.risk_score:.1f}/100), Rain={st_silchar.current_rainfall:.1f}mm")
    assert st_tawang.risk_level == 'CRITICAL', 'Tawang must be CRITICAL'
    assert st_cherra.risk_level == 'CRITICAL', 'Cherrapunji must be CRITICAL'
    assert st_silchar.risk_level == 'LOW', 'Silchar must be LOW'
    print(">> Database verification PASSED!\n")

    print("=" * 60)
    print("2. MULTILINGUAL RESPONSES (GEMINI LIVE OR TELEMETRY FALLBACK)")
    print("=" * 60)
    for lang in ['en', 'hi', 'bn', 'as']:
        res = await chat(ChatMessage(message='What is the risk level of Silchar?', language=lang))
        src = res.get('source')
        print(f"\n--- Language: {lang.upper()} (Engine: {src}) ---")
        print(res.get('response'))

    print("\n" + "=" * 60)
    print("3. DETERMINISTIC TELEMETRY FALLBACK ENGINE TEST")
    print("=" * 60)
    saved_key = os.environ.get('GEMINI_API_KEY', '')
    try:
        os.environ['GEMINI_API_KEY'] = ''
        for lang in ['en', 'hi', 'bn', 'as']:
            res_fb = await chat(ChatMessage(message='Identify the highest risk zone in NER right now.', language=lang))
            src = res_fb.get('source')
            print(f"\n--- Fallback [{lang.upper()}] (Engine: {src}) ---")
            print(res_fb.get('response'))
            assert any(s in res_fb.get('response') for s in ['Cherrapunji', 'Tawang', 'চেরাপুঞ্জি', 'তপঞ্জি', 'चेरापूंजी', 'तवांग', 'তাৱাং', 'তাওয়াং'])
    finally:
        if saved_key:
            os.environ['GEMINI_API_KEY'] = saved_key

    print("\n>> All test suites PASSED successfully!")

if __name__ == '__main__':
    asyncio.run(run_verification())
