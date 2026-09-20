# Walkthrough: NIRAKSHA Landslide Early Warning System (SIH Finals Ready)

The NIRAKSHA Landslide Early Warning & Tactical Response Platform has been upgraded and finalized for the **Smart India Hackathon (SIH) Finals Presentation**.

---

## 🚀 What Was Built & Upgraded

### Part 1 — Twilio Automated Voice Call Alerts
1. **Backend Telephony Engine (`routers/calls.py`)**:
   - **Outbound Voice Call Dispatch**: When any station's `risk_score` reaches $\ge 75.0$ (`CRITICAL`), NIRAKSHA automatically initiates a live telephony call via the Twilio Voice API.
   - **Emergency Voice Protocol (TwiML)**:
     ```xml
     <Response>
       <Say voice="alice" language="en-IN">
         Emergency Alert from NIRAKSHA Landslide Early Warning System.
         Station {station_name} has reached CRITICAL risk level.
         Risk score is {risk_score} out of 100.
         Evacuation procedures should be initiated immediately.
         Repeat. Station {station_name} is at CRITICAL risk.
       </Say>
     </Response>
     ```
   - **Endpoints**:
     - `POST /api/calls/alert`: Dispatches emergency call for station. Supports both live Twilio transmission and fallback simulation.
     - `GET /api/calls/log`: Returns chronological call logs with timestamp, station name, recipient, call status (`COMPLETED`, `RINGING`, `FAILED`), and Twilio Call SID.
     - `GET /api/calls/mode`: Returns whether live telephony credentials are active or running in simulated mock mode.
   - **Automatic Simulation Trigger**: In `services/simulation.py`, whenever background simulation calculates a risk score $\ge 75.0$, `trigger_critical_call_if_needed` dispatches the alert automatically with 1-hour anti-spam deduplication.
2. **Frontend Voice Alerts Page (`/calls`)**:
   - **Status Banner**: Live green/amber indicator showing operational mode (`LIVE TWILIO MODE` or `MOCK DEMO MODE`), configured phone numbers, and Account SID mask.
   - **Manual Emergency Call Panel**: Allows the operator to trigger a manual emergency test call to any selected station.
   - **Transmission History Log**: Displays past dispatches with call SID, recipient phone number, station, timestamp, and status badges.

---

### Part 2 — Weather Forecast & Landslide Risk Prediction
1. **Meteorological API & ML Integration (`routers/weather_forecast.py`)**:
   - Fetches **7-day precipitation forecasts, rainfall sums, maximum temperatures, wind speeds, and soil moisture levels** from the Open-Meteo Weather API (`https://api.open-meteo.com/v1/forecast`) using exact GPS coordinates for each station.
   - Automatically feeds forecasted weather parameters into the trained **Gradient Boosting / XGBoost Landslide Risk Model** to predict the future 7-day risk curve and risk classifications (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`).
   - Includes a robust fallback generator guaranteeing smooth uninterrupted demonstrations even during network outages.
   - **Endpoints**:
     - `GET /api/weather/forecast/{station_id}`: Station-specific 7-day daily weather & risk predictions.
     - `GET /api/weather/forecast/all`: Regional overview across all 20 NER monitoring stations, highlighting peak rain dates and identifying highest-vulnerability days.
2. **Frontend Weather Forecast Page (`/weather`)**:
   - **Station Selector & Advance Warning Box**: Highlights days where precipitation exceeds 50mm or risk reaches `HIGH`/`CRITICAL`.
   - **7-Day Risk Calendar**: 7 interactive cards displaying Day, Date, Weather Icon, Predicted Rain (mm), Soil Moisture, and Risk Badge.
   - **Risk vs. Precipitation Recharts Visualization**: Dual-axis line chart tracking daily rainfall vs. predicted landslide vulnerability score.
   - **20-Station Summary Table**: Complete table of all monitored NER stations with current vs. peak forecasted rain, 7-day trend indicators, and peak risk levels.

---

### Part 3 — Frontend Polish & Animations
1. **Sidebar Navigation**:
   - Exactly **10 items** in required order:
     1. 🏠 **Dashboard** (`/`)
     2. 🚨 **Alerts** (`/alerts`)
     3. 🎯 **Priority Response** (`/priority`)
     4. 📝 **Field Reports** (`/reports`)
     5. 📡 **Stations** (`/stations`)
     6. 📋 **Timeline** (`/timeline`)
     7. 🚁 **Resources** (`/resources`)
     8. 🌦️ **Weather Forecast** (`/weather`)
     9. 📞 **Voice Alerts** (`/calls`)
     10. 📊 **Model Performance** (`/models`)
   - Added hover tooltips (`group-hover:opacity-100`) and mobile slide-over hamburger drawer.
2. **Smooth Transitions & Badges**:
   - Wrapped views in `PageTransition` with `framer-motion` for fluid opacity and slide-up animations.
   - Enhanced `RiskBadge`:
     - `CRITICAL`: Animated with `@keyframes pulse-glow-critical` (flashing red ring and glow shadow).
     - `HIGH`: Subtle amber pulse.
   - Added `AnimatedNumber` count-up animations for dashboard metrics and timeline stat cards.
   - Added `SkeletonCard` shimmer loader for responsive data-fetching states.
   - Standard dark palette preserved: Background `#0f172a`, cards `#1e293b`, borders `#334155`.

---

## 🧪 Verification & Test Results

### 1. Pytest Automated Test Suite
All 12 automated unit and integration tests passed cleanly:
```
============================= test session starts =============================
collected 12 items

tests\test_calls_and_weather.py .....                                    [ 41%]
tests\test_corrections.py ....                                           [ 75%]
tests\test_evacuation.py .                                               [ 83%]
tests\test_statistics.py .                                               [ 91%]
tests\test_timeline.py .                                                 [100%]

====================== 12 passed, 35 warnings in 11.38s =======================
```

### 2. Multilingual AI Chat & Deterministic Telemetry Test
Ran `tests/test_chat_verification.py`:
- **Database Ground Truth**: Verified Tawang & Cherrapunji are `CRITICAL`, Silchar is `LOW`.
- **Google Gemini 2.5 Flash API**: Responded live with real telemetry across all 4 languages:
  - English (`EN`)
  - Hindi (`HI`)
  - Bengali (`BN`)
  - Assamese (`AS`)
- **Deterministic Telemetry Fallback Engine**: Passed for all 4 languages when API key is unconfigured or rate-limited.

### 3. Live Server Connectivity
- **Backend**: Running at `http://127.0.0.1:8000`
  - `GET /api/calls/mode`: `200 OK` (`LIVE` mode active)
  - `GET /api/calls/log`: `200 OK` (4 historical & auto-dispatched records logged)
  - `GET /api/weather/forecast/all`: `200 OK` (All 20 stations forecast ready)
- **Frontend**: Running at `http://127.0.0.1:5179`
  - Vite dev server active and serving HTTP 200.

---

## 🎯 Final Presentation Demo Guide (For SIH Finals)

| Feature | How to Demo |
| :--- | :--- |
| **Twilio Voice Alerts** | Navigate to `📞 Voice Alerts` (`/calls`). Select a station like **Tawang** or **Cherrapunji** and click **"Trigger Emergency Call"**. Point out the outbound call log, Call SID, and automated trigger when risk score crosses 75. |
| **Weather & ML Forecast** | Navigate to `🌦️ Weather Forecast` (`/weather`). Show the 7-day risk calendar, toggle between stations (e.g. Cherrapunji, Gangtok, Tawang), highlight the Recharts precipitation vs. risk correlation curve, and scroll through the 20-station NER summary table. |
| **Multilingual AI Chat** | Click the floating chatbot in the bottom right corner. Toggle between English, Hindi, Bengali, and Assamese. Ask *"What is the risk level of Cherrapunji?"* to demonstrate real-time telemetry extraction. |
| **Priority Tactical Response** | Navigate to `🎯 Priority Response` (`/priority`). Show the automated triage ranking, NDRF rescue team assignments, and evacuation shelter allocations. |
