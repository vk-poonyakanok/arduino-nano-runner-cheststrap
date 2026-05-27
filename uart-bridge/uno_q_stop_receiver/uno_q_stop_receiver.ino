/*
  Stops the UNO Q UART receiver demo.

  Upload this when you want the UNO Q sketch to stay idle and stop printing
  telemetry logs from Serial1.
*/

#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  Serial1.begin(9600);

  while (!Serial && millis() < 3000) {
    ;
  }

  Serial.println("UNO Q UART receiver stopped");
}

void loop() {
  // Intentionally idle. Serial1 is not read and no telemetry is printed.
}

