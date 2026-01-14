@echo off
REM Lanceur Windows : préfère Node (port 4173), sinon Python sur le même port.
REM Double-cliquez pour démarrer.

setlocal
set PORT=4173
cd /d "%~dp0"

REM --- Node en priorité ---
where node >nul 2>nul
if %errorlevel%==0 (
    echo Node detecte, lancement du serveur local sur http://localhost:%PORT% ...
    node local-server.mjs
    goto :EOF
)

REM --- Python fallback (py, python3, python) ---
for %%P in (py python3 python) do (
    %%P -V >nul 2>nul
    if not errorlevel 1 (
        echo Node non detecte, bascule vers %%P -m http.server %PORT% ...
        start "" http://localhost:%PORT%
        %%P -m http.server %PORT%
        goto :EOF
    )
)

echo Ni Node ni Python detectes. Installez-en un des deux pour lancer l'application.
pause
exit /b 1

:EOF
echo.
echo Serveur arrete. Appuyez sur une touche pour fermer.
pause>nul
endlocal
