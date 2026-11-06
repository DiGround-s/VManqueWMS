/**
 * Pick-to-light wiring, shared by the UI simulator and the ESP32 firmware
 * (firmware/esp32-pick-to-light). Keep both in sync.
 *
 * One WS2812B strip per aisle row (A-01, A-02, B-01…) runs along the shelf fronts.
 * Each rack reserves room for 4 levels, and each slot (rack + level) lights LEDS_PER_SLOT pixels.
 */
export const LEDS_PER_SLOT = 6;
export const LEVELS_PER_RACK = 4;
export const RACKS_PER_ROW = 6;
export const PIXELS_PER_STRIP = RACKS_PER_ROW * LEVELS_PER_RACK * LEDS_PER_SLOT; // 144 pixels = 2.4 m of a 60 LED/m strip

export const MQTT = { broker: "192.168.10.10", port: 1883, topic: "vmanque/bc/led", clientId: "esp32-bc-01" } as const;

/** "A-02-06-03" → strip "A-02", first pixel and count. Null for codes without aisle/rack/level (docks). */
export function pixelsFor(code: string): { strip: string; first: number; count: number } | null {
  const m = /^([A-Z]+)-(\d+)-(\d+)-(\d+)$/.exec(code);
  if (!m) return null;
  const rack = Number(m[3]);
  const level = Number(m[4]);
  if (rack < 1 || rack > RACKS_PER_ROW || level < 1 || level > LEVELS_PER_RACK) return null;
  return { strip: `${m[1]}-${m[2]}`, first: ((rack - 1) * LEVELS_PER_RACK + (level - 1)) * LEDS_PER_SLOT, count: LEDS_PER_SLOT };
}
