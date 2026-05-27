/*
  Real Nano 33 BLE Sense telemetry over UART to UNO Q.

  Wiring:
    Nano 33 BLE Sense TX/D1 -> UNO Q D0/RX
    Nano 33 BLE Sense GND   -> UNO Q GND

  Sensor inputs:
    Built-in LSM9DS1 IMU on Nano 33 BLE Sense Rev1
    Optional OJFF14 sound sensor: S -> A7, + -> 3V3, - -> GND

  Output:
    Newline-delimited JSON at 20 Hz on Serial1, 115200 baud.
*/

#include <Arduino.h>
#include <Arduino_LSM9DS1.h>

const uint32_t USB_BAUD_RATE = 115200;
const uint32_t UART_BAUD_RATE = 115200;
const uint32_t SEND_INTERVAL_MS = 50;
const uint32_t LOG_INTERVAL_MS = 1000;

// OJFF14 is currently unplugged. Set this to 1 when the sensor is wired again.
#define ENABLE_OJFF14_SOUND 0

const int SOUND_PIN = A7;
const float ADC_REF_VOLTS = 3.3f;
const int ADC_MAX = 4095;
const int SOUND_SAMPLES = 32;

bool imuReady = false;
bool gotAccel = false;
bool gotGyro = false;
bool gotMag = false;

uint32_t sequenceNumber = 0;
uint32_t lastSendMs = 0;
uint32_t lastLogMs = 0;

float axG = 0.0f;
float ayG = 0.0f;
float azG = 1.0f;
float gxDps = 0.0f;
float gyDps = 0.0f;
float gzDps = 0.0f;
float mxUT = 0.0f;
float myUT = 0.0f;
float mzUT = 0.0f;

int soundRaw = 0;
int soundPeak = 0;
float soundVolts = 0.0f;
float soundLevel = 0.0f;

void readSoundSensor() {
#if ENABLE_OJFF14_SOUND
  int minRaw = ADC_MAX;
  int maxRaw = 0;
  long sumRaw = 0;

  for (int i = 0; i < SOUND_SAMPLES; i++) {
    int v = analogRead(SOUND_PIN);
    minRaw = min(minRaw, v);
    maxRaw = max(maxRaw, v);
    sumRaw += v;
    delayMicroseconds(120);
  }

  soundRaw = static_cast<int>(sumRaw / SOUND_SAMPLES);
  soundPeak = maxRaw - minRaw;
  soundVolts = soundRaw * ADC_REF_VOLTS / ADC_MAX;
  soundLevel = constrain(soundPeak / 900.0f, 0.0f, 1.0f);
#else
  soundRaw = 0;
  soundPeak = 0;
  soundVolts = 0.0f;
  soundLevel = 0.0f;
#endif
}

void sendJson(Stream &out, uint32_t nowMs) {
  const float ax = axG * 9.80665f;
  const float ay = ayG * 9.80665f;
  const float az = azG * 9.80665f;
  const float gx = gxDps * DEG_TO_RAD;
  const float gy = gyDps * DEG_TO_RAD;
  const float gz = gzDps * DEG_TO_RAD;

  out.print(F("{\"type\":\"data\",\"seq\":"));
  out.print(sequenceNumber++);
  out.print(F(",\"t\":"));
  out.print(nowMs);
  out.print(F(",\"ax\":"));
  out.print(ax, 4);
  out.print(F(",\"ay\":"));
  out.print(ay, 4);
  out.print(F(",\"az\":"));
  out.print(az, 4);
  out.print(F(",\"gx\":"));
  out.print(gx, 5);
  out.print(F(",\"gy\":"));
  out.print(gy, 5);
  out.print(F(",\"gz\":"));
  out.print(gz, 5);
  out.print(F(",\"mx\":"));
  out.print(mxUT, 2);
  out.print(F(",\"my\":"));
  out.print(myUT, 2);
  out.print(F(",\"mz\":"));
  out.print(mzUT, 2);
  out.print(F(",\"magReady\":"));
  out.print(gotMag ? F("true") : F("false"));
  out.print(F(",\"soundRaw\":"));
  out.print(soundRaw);
  out.print(F(",\"soundPeak\":"));
  out.print(soundPeak);
  out.print(F(",\"soundVolts\":"));
  out.print(soundVolts, 3);
  out.print(F(",\"soundLevel\":"));
  out.print(soundLevel, 3);
  out.println(F("}"));
}

void setup() {
  Serial.begin(USB_BAUD_RATE);
  Serial1.begin(UART_BAUD_RATE);

  while (!Serial && millis() < 2500) {
    ;
  }

  analogReadResolution(12);
  imuReady = IMU.begin();

  Serial.println(F("Nano real signal UART sender ready"));
  Serial.print(F("IMU ready: "));
  Serial.println(imuReady ? F("true") : F("false"));
  Serial.print(F("OJFF14 sound enabled: "));
  Serial.println(ENABLE_OJFF14_SOUND ? F("true") : F("false"));
}

void loop() {
  if (!imuReady) {
    if (millis() - lastLogMs >= LOG_INTERVAL_MS) {
      lastLogMs = millis();
      Serial.println(F("IMU init failed; no UART telemetry sent"));
    }
    return;
  }

  if (IMU.accelerationAvailable()) {
    IMU.readAcceleration(axG, ayG, azG);
    gotAccel = true;
  }
  if (IMU.gyroscopeAvailable()) {
    IMU.readGyroscope(gxDps, gyDps, gzDps);
    gotGyro = true;
  }
  if (IMU.magneticFieldAvailable()) {
    IMU.readMagneticField(mxUT, myUT, mzUT);
    gotMag = true;
  }

  if (!gotAccel || !gotGyro) {
    return;
  }

  uint32_t nowMs = millis();
  if (nowMs - lastSendMs < SEND_INTERVAL_MS) {
    return;
  }
  lastSendMs = nowMs;

  readSoundSensor();
  sendJson(Serial1, nowMs);

  if (nowMs - lastLogMs >= LOG_INTERVAL_MS) {
    lastLogMs = nowMs;
    Serial.print(F("UART packets sent: "));
    Serial.println(sequenceNumber);
  }
}
