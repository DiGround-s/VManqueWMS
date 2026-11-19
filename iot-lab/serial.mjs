// Muestra el monitor serie del ESP32 emulado (Wokwi para VS Code, rfc2217ServerPort = 4000 en wokwi/wokwi.toml).
//   node serial.mjs
import net from "net";
const s = net.connect(4000, "127.0.0.1", () => console.log("[serial] conectado a 127.0.0.1:4000 (Ctrl+C para salir)"));
let buf = Buffer.alloc(0);
s.on("data", (d) => {
  // Quita las secuencias Telnet (IAC = 0xFF) de la negociación RFC2217 y deja sólo el texto del ESP32.
  const out = [];
  for (let i = 0; i < d.length; i++) {
    if (d[i] === 0xff) {
      const cmd = d[i + 1];
      if (cmd === 0xfa) { while (i < d.length && !(d[i] === 0xff && d[i + 1] === 0xf0)) i++; i++; }
      else if (cmd >= 0xfb && cmd <= 0xfe) i += 2;
      else i += 1;
      continue;
    }
    out.push(d[i]);
  }
  process.stdout.write(Buffer.from(out).toString("utf8").replace(/\r?\n/g, "\n"));
});
s.on("error", (e) => console.error(`[serial] ${e.message} (¿está corriendo el simulador con rfc2217ServerPort = 4000?)`));
s.on("close", () => console.log("\n[serial] desconectado"));
