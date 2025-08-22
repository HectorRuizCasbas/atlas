@echo off
set /p comentario="Introduce el comentario para el commit: "

echo.
echo ----------------------------------------
echo Realizando git add...
git add .

echo.
echo ----------------------------------------
echo Realizando git commit...
git commit -m "%comentario%"

echo.
echo ----------------------------------------
echo Realizando git push...
git push

echo.
echo ----------------------------------------
echo ¡Despliegue completado!
echo Accede a: zelenza-atlas.vercel.app

pause