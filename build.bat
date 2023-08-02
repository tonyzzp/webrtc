@echo off
echo ----- build server
call pnpm -C server i
call pnpm -C server run build

echo ----- build client
call pnpm -C client i
call pnpm -C client run build

echo ----- copy files to /dist
rd /s /q dist
mkdir dist
xcopy /y /e server\dist\ dist\
xcopy /y /e client\dist\ dist\