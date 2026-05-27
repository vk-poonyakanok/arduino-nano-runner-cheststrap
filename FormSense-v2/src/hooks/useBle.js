import { useCallback, useEffect, useRef, useState } from "react";
import { SERVICE_UUID, CHAR_UUID, parsePacket } from "../lib/bleContract";

const STALE_MS      = 2000;   // no packet for 2 s → show stale indicator
const RECONNECT_MS  = 5000;   // retry interval after disconnect

export function useBle() {
  const [status,  setStatus]  = useState("disconnected"); // "connected"|"stale"|"disconnected"
  const [device,  setDevice]  = useState(null);
  const [latest,  setLatest]  = useState(null);
  const [rssi,    setRssi]    = useState(null);

  const deviceRef    = useRef(null);
  const charRef      = useRef(null);
  const staleTimer   = useRef(null);
  const reconnTimer  = useRef(null);

  // ── helpers ──────────────────────────────────────────────────────────────

  const clearTimers = () => {
    clearTimeout(staleTimer.current);
    clearTimeout(reconnTimer.current);
  };

  const armStaleTimer = useCallback(() => {
    clearTimeout(staleTimer.current);
    staleTimer.current = setTimeout(() => {
      setStatus("stale");
    }, STALE_MS);
  }, []);

  const subscribeChar = useCallback(async (char) => {
    char.addEventListener("characteristicvaluechanged", (e) => {
      const text   = new TextDecoder().decode(e.target.value);
      const packet = parsePacket(text);
      if (!packet) return;
      setLatest(packet);
      setStatus("connected");
      armStaleTimer();
    });
    await char.startNotifications();
  }, [armStaleTimer]);

  const tryReconnect = useCallback(async () => {
    clearTimeout(reconnTimer.current);
    reconnTimer.current = setTimeout(async () => {
      const dev = deviceRef.current;
      if (!dev) return;
      try {
        const server  = await dev.gatt.connect();
        const service = await server.getPrimaryService(SERVICE_UUID);
        const char    = await service.getCharacteristic(CHAR_UUID);
        charRef.current = char;
        await subscribeChar(char);
        setStatus("connected");
        armStaleTimer();
      } catch {
        tryReconnect();   // keep retrying silently
      }
    }, RECONNECT_MS);
  }, [subscribeChar, armStaleTimer]);

  // ── public API ────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (!navigator.bluetooth) {
      alert("Web Bluetooth is not supported in this browser.\nUse Chrome on Android or desktop.");
      return;
    }
    try {
      const dev = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID] }],
      });
      deviceRef.current = dev;
      setDevice(dev);

      dev.addEventListener("gattserverdisconnected", () => {
        setStatus("disconnected");
        tryReconnect();
      });

      const server  = await dev.gatt.connect();
      const service = await server.getPrimaryService(SERVICE_UUID);
      const char    = await service.getCharacteristic(CHAR_UUID);
      charRef.current = char;
      await subscribeChar(char);
      setStatus("connected");
      armStaleTimer();
    } catch (err) {
      if (err.name !== "NotFoundError") {
        console.error("BLE connect error:", err);
      }
    }
  }, [subscribeChar, armStaleTimer, tryReconnect]);

  const disconnect = useCallback(() => {
    clearTimers();
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }
    deviceRef.current = null;
    charRef.current   = null;
    setDevice(null);
    setStatus("disconnected");
    setLatest(null);
    setRssi(null);
  }, []);

  useEffect(() => () => clearTimers(), []);

  return { status, device, latest, rssi, connect, disconnect };
}
