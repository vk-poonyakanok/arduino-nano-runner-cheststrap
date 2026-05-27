# UART Bridge: Nano 33 BLE Sense to UNO Q

This bridge sends real runner telemetry from the Nano 33 BLE Sense to the UNO Q over one-way UART.

## Wiring

```text
Nano 33 BLE Sense TX/D1 -> UNO Q D0/RX
Nano 33 BLE Sense GND   -> UNO Q GND
```

Optional OJFF14 sound sensor:

```text
OJFF14 S -> Nano A7
OJFF14 + -> Nano 3V3
OJFF14 - -> Nano GND
```

OJFF14 is currently disabled in `nano_real_signal_uart/nano_real_signal_uart.ino`:

```cpp
#define ENABLE_OJFF14_SOUND 0
```

Set it to `1` when the sensor is wired again.

## Start

Run from this `uart-bridge` folder:

```powershell
.\install_arduino_test_tools.bat
.\start_real_signal_uart.bat
```

Default ports:

```text
COM6 = UNO Q
COM8 = Nano 33 BLE Sense
```

If ports changed:

```powershell
.\start_real_signal_uart.bat COM6 COM8
```

The first argument is the UNO Q port. The second argument is the Nano port.

## Monitor

In Arduino App Lab Board Shell:

```bash
arduino-app-cli monitor
```

Expected output:

```text
seq=123 accelMag=9.82 gyroMag=0.04 lean=1.2 roll=-0.8 sound=0.000 peak=0 state=STEADY packets=123 dropped=0
```

## Stop

```powershell
.\stop_both_boards.bat
```

