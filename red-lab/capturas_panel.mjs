// Capturas del panel web de pfSense del laboratorio (https://127.0.0.1:8443, reenvío de VirtualBox).
//   node red-lab/capturas_panel.mjs   (usa playwright-core instalado en iot-lab y Microsoft Edge)
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(aqui, "..", "iot-lab", "package.json"))("playwright-core");
const URL = "https://127.0.0.1:8443";
const salida = (n) => path.join(aqui, "capturas", `panel-${n}.png`);

const b = await chromium.launch({ channel: "msedge" });
const p = await b.newPage({ viewport: { width: 1400, height: 900 }, ignoreHTTPSErrors: true, deviceScaleFactor: 1.25 });
await p.goto(`${URL}/`);
await p.fill("#usernamefld", "admin");
await p.fill("#passwordfld", "pfsense"); // clave de fábrica, sólo en el laboratorio
await p.click('input[name="login"]');
await p.waitForLoadState("networkidle");

const paginas = [
  ["01-dashboard", "/index.php"],
  ["02-interfaces", "/interfaces_assign.php"],
  ["03-vlans", "/interfaces_vlan.php"],
  ["04-alias", "/firewall_aliases.php?tab=all"],
  ["05-reglas-vlan10", "/firewall_rules.php?if=lan"],
  ["06-reglas-vlan20", "/firewall_rules.php?if=opt1"],
  ["07-reglas-vlan30", "/firewall_rules.php?if=opt2"],
  ["08-reglas-wan", "/firewall_rules.php?if=wan"],
  ["09-dhcp-leases", "/status_dhcp_leases.php"],
  ["10-log-firewall", "/status_logs_filter.php"],
];
for (const [n, ruta] of paginas) {
  await p.goto(URL + ruta);
  await p.waitForLoadState("networkidle");
  await p.waitForTimeout(n === "01-dashboard" ? 3000 : 800);
  await p.screenshot({ path: salida(n), fullPage: true });
  console.log("captura", n);
}
await b.close();
