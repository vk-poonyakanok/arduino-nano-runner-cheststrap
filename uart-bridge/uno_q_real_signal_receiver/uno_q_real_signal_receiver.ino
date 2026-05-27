/*
  UNO Q receiver for real Nano 33 BLE Sense runner telemetry.

  Wiring:
    Nano 33 BLE Sense TX/D1 -> UNO Q D0/RX
    Nano 33 BLE Sense GND   -> UNO Q GND

  Serial1 receives newline-delimited JSON from Nano at 115200 baud.
  Serial prints processed summaries to App Lab / Arduino monitor.
*/

#include <Arduino.h>
#include <math.h>

const uint32_t USB_BAUD_RATE = 115200;
const uint32_t UART_BAUD_RATE = 115200;
const uint32_t STALE_TIMEOUT_MS = 3000;
const uint32_t PRINT_INTERVAL_MS = 250;
const size_t RX_BUFFER_SIZE = 384;

char rxBuffer[RX_BUFFER_SIZE];
size_t rxIndex = 0;

uint32_t packetCount = 0;
uint32_t droppedCount = 0;
uint32_t lastPacketMs = 0;
uint32_t lastPrintMs = 0;

struct RunnerSignal {
  uint32_t seq;
  uint32_t sampleTimeMs;
  float ax;
  float ay;
  float az;
  float gx;
  float gy;
  float gz;
  float mx;
  float my;
  float mz;
  int soundRaw;
  int soundPeak;
  float soundVolts;
  float soundLevel;
  bool magReady;
};

RunnerSignal latest = {};
bool hasLatest = false;

bool extractNumber(const char *json, const char *key, float &value) {
  const char *pos = strstr(json, key);
  if (pos == nullptr) {
    return false;
  }

  pos += strlen(key);
  if (!isdigit(*pos) && *pos != '-' && *pos != '+') {
    return false;
  }

  value = static_cast<float>(atof(pos));
  return true;
}

bool extractUInt(const char *json, const char *key, uint32_t &value) {
  const char *pos = strstr(json, key);
  if (pos == nullptr) {
    return false;
  }

  pos += strlen(key);
  char *endPtr = nullptr;
  value = strtoul(pos, &endPtr, 10);
  return endPtr != pos;
}

bool extractInt(const char *json, const char *key, int &value) {
  float parsed = 0.0f;
  if (!extractNumber(json, key, parsed)) {
    return false;
  }
  value = static_cast<int>(parsed);
  return true;
}

bool parseRunnerSignal(const char *line, RunnerSignal &out) {
  if (strstr(line, "\"type\":\"data\"") == nullptr) {
    return false;
  }

  bool ok = true;
  ok = extractUInt(line, "\"seq\":", out.seq) && ok;
  ok = extractUInt(line, "\"t\":", out.sampleTimeMs) && ok;
  ok = extractNumber(line, "\"ax\":", out.ax) && ok;
  ok = extractNumber(line, "\"ay\":", out.ay) && ok;
  ok = extractNumber(line, "\"az\":", out.az) && ok;
  ok = extractNumber(line, "\"gx\":", out.gx) && ok;
  ok = extractNumber(line, "\"gy\":", out.gy) && ok;
  ok = extractNumber(line, "\"gz\":", out.gz) && ok;
  ok = extractNumber(line, "\"mx\":", out.mx) && ok;
  ok = extractNumber(line, "\"my\":", out.my) && ok;
  ok = extractNumber(line, "\"mz\":", out.mz) && ok;
  ok = extractInt(line, "\"soundRaw\":", out.soundRaw) && ok;
  ok = extractInt(line, "\"soundPeak\":", out.soundPeak) && ok;
  ok = extractNumber(line, "\"soundVolts\":", out.soundVolts) && ok;
  ok = extractNumber(line, "\"soundLevel\":", out.soundLevel) && ok;
  out.magReady = strstr(line, "\"magReady\":true") != nullptr;

  return ok;
}

const __FlashStringHelper *classify(float accelMag, float gyroMag, float soundLevel) {
  if (accelMag > 18.0f || gyroMag > 4.0f || soundLevel > 0.65f) {
    return F("HIGH");
  }
  if (accelMag > 13.0f || gyroMag > 2.0f || soundLevel > 0.25f) {
    return F("ACTIVE");
  }
  return F("STEADY");
}

void printSummary(const RunnerSignal &s) {
  float accelMag = sqrtf(s.ax * s.ax + s.ay * s.ay + s.az * s.az);
  float gyroMag = sqrtf(s.gx * s.gx + s.gy * s.gy + s.gz * s.gz);
  float leanDeg = atan2f(s.ax, s.az) * 180.0f / PI;
  float rollDeg = atan2f(s.ay, s.az) * 180.0f / PI;

  Serial.print(F("seq="));
  Serial.print(s.seq);
  Serial.print(F(" accelMag="));
  Serial.print(accelMag, 2);
  Serial.print(F(" gyroMag="));
  Serial.print(gyroMag, 2);
  Serial.print(F(" lean="));
  Serial.print(leanDeg, 1);
  Serial.print(F(" roll="));
  Serial.print(rollDeg, 1);
  Serial.print(F(" sound="));
  Serial.print(s.soundLevel, 3);
  Serial.print(F(" peak="));
  Serial.print(s.soundPeak);
  Serial.print(F(" state="));
  Serial.print(classify(accelMag, gyroMag, s.soundLevel));
  Serial.print(F(" packets="));
  Serial.print(packetCount);
  Serial.print(F(" dropped="));
  Serial.println(droppedCount);
}

void handleLine(const char *line) {
  RunnerSignal parsed;
  if (parseRunnerSignal(line, parsed)) {
    latest = parsed;
    hasLatest = true;
    packetCount++;
    lastPacketMs = millis();
  } else {
    droppedCount++;
  }
}

void readUart() {
  while (Serial1.available() > 0) {
    char c = static_cast<char>(Serial1.read());

    if (c == '\r') {
      continue;
    }

    if (c == '\n') {
      rxBuffer[rxIndex] = '\0';
      if (rxIndex > 0) {
        handleLine(rxBuffer);
      }
      rxIndex = 0;
      continue;
    }

    if (rxIndex < RX_BUFFER_SIZE - 1) {
      rxBuffer[rxIndex++] = c;
    } else {
      rxIndex = 0;
      droppedCount++;
      Serial.println(F("UART frame too long; buffer reset"));
    }
  }
}

void setup() {
  Serial.begin(USB_BAUD_RATE);
  while (!Serial && millis() < 3000) {
    ;
  }

  Serial1.begin(UART_BAUD_RATE);
  lastPacketMs = millis();

  Serial.println(F("UNO Q real signal UART receiver ready"));
}

void loop() {
  readUart();

  uint32_t now = millis();
  if (hasLatest && now - lastPrintMs >= PRINT_INTERVAL_MS) {
    lastPrintMs = now;
    printSummary(latest);
  }

  if (now - lastPacketMs > STALE_TIMEOUT_MS) {
    Serial.println(F("No real signal telemetry received"));
    lastPacketMs = now;
  }
}
