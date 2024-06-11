@echo off
echo ----- build server
call npm -C server i
call npm -C server run build

echo ----- build client
call npm -C client i
call npm -C client run build

echo ----- copy files to /dist
rd /s /q dist
mkdir dist
xcopy /y /e server\dist\ dist\
xcopy /y /e client\dist\ dist\