/*
  Stops Nano UART telemetry.

  Upload this to the Nano 33 BLE Sense when you want it to stay powered but stop
  sending data to the UNO Q over Serial1.
*/

#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  Serial1.begin(9600);

  while (!Serial && millis() < 2000) {
    ;
  }

  Serial.println("Nano UART telemetry stopped");
}

void loop() {
  // Intentionally idle. Nothing is sent to Serial1.
}

