@echo off
echo Starting FluSight-Asia Live System...
echo =========================================
echo 1. Starting Frontend (Vite)...
start "FluSight Frontend" /D "%~dp0frontend" npm run dev

echo 2. Starting Live Learning Agent (The Brain)...
start "FluSight AI Brain" /D "%~dp0" python pipeline/scripts/live_pipeline.py

echo 3. Starting Data Stream Replay (The Feeder)...
timeout /t 5 /nobreak >nul
start "FluSight Data Stream" /D "%~dp0" python pipeline/scripts/stream_replay.py

echo =========================================
echo All systems go! 
echo Access the dashboard at http://localhost:5173
echo Press any key to exit this launcher (terminals will stay open).
pause
