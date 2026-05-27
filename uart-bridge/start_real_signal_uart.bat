@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
set "CLI=%ROOT%.tools\arduino-cli\arduino-cli.exe"
set "UNOQ_PORT=%~1"
set "NANO_PORT=%~2"

if "%UNOQ_PORT%"=="" set "UNOQ_PORT=COM6"
if "%NANO_PORT%"=="" set "NANO_PORT=COM8"

echo.
echo === Start real signal UART demo ===
echo UNO Q port : %UNOQ_PORT%
echo Nano port  : %NANO_PORT%
echo.

if not exist "%CLI%" (
  echo ERROR: Arduino CLI not found:
  echo %CLI%
  echo Run install_arduino_test_tools.bat first.
  exit /b 1
)

echo Installing required Nano sensor library...
"%CLI%" lib install Arduino_LSM9DS1
if errorlevel 1 goto :failed

echo.
echo Compiling UNO Q receiver...
"%CLI%" compile --fqbn arduino:zephyr:unoq "%ROOT%uno_q_real_signal_receiver"
if errorlevel 1 goto :failed

echo Uploading UNO Q receiver...
"%CLI%" upload -p %UNOQ_PORT% --fqbn arduino:zephyr:unoq "%ROOT%uno_q_real_signal_receiver"
if errorlevel 1 goto :failed

echo.
echo Compiling Nano real signal sender...
"%CLI%" compile --fqbn arduino:mbed_nano:nano33ble "%ROOT%nano_real_signal_uart"
if errorlevel 1 goto :failed

echo Uploading Nano real signal sender...
"%CLI%" upload -p %NANO_PORT% --fqbn arduino:mbed_nano:nano33ble "%ROOT%nano_real_signal_uart"
if errorlevel 1 goto :failed

echo.
echo === Done ===
echo Real IMU + OJFF sound telemetry is now sent Nano TX/D1 -> UNO Q D0/RX.
echo Use App Lab Board Shell:
echo arduino-app-cli monitor
echo.
exit /b 0

:failed
echo.
echo ERROR: Start script failed.
echo Check that COM ports are correct and close any open Serial Monitor first.
exit /b 1

