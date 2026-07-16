@echo off
echo ============================================
echo   PWI CMMS - Local Development Server
echo   http://127.0.0.1:8788
echo ============================================
echo.
echo Starting wrangler pages dev...
echo Static files: cloudflare/
echo Functions:    functions/
echo API proxy:    functions/api/[[path]].js -> GAS
echo.
echo Press Ctrl+C to stop.
echo.
wrangler pages dev cloudflare/ --port 8788 --compatibility-date 2024-01-01
