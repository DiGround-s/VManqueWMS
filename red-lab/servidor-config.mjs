// Servidor temporal para intercambiar config.xml con la VM pfSense (por el NAT de VirtualBox la VM ve este PC como 10.0.2.2).
//   PUT  /original     → guarda el config.xml que sube pfSense en red-lab/config-original.xml
//   GET  /config.xml   → entrega red-lab/config-lab.xml (la configuración del laboratorio)
//   PUT  /log/<nombre> → guarda textos (por ejemplo el log del firewall) en red-lab/capturas/<nombre>
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const aqui = path.dirname(fileURLToPath(import.meta.url));
http
  .createServer((req, res) => {
    const cuerpo = [];
    req.on("data", (c) => cuerpo.push(c));
    req.on("end", () => {
      const datos = Buffer.concat(cuerpo);
      if (req.method === "PUT" && req.url === "/original") fs.writeFileSync(path.join(aqui, "config-original.xml"), datos);
      else if (req.method === "PUT" && req.url.startsWith("/log/")) fs.writeFileSync(path.join(aqui, "capturas", path.basename(req.url)), datos);
      else if (req.method === "GET" && req.url === "/config.xml") return res.end(fs.readFileSync(path.join(aqui, "config-lab.xml")));
      else return res.writeHead(404).end();
      console.log(new Date().toLocaleTimeString("es-CL"), req.method, req.url, datos.length, "bytes");
      res.end("ok\n");
    });
  })
  .listen(8099, "127.0.0.1", () => console.log("Servidor de configuración en 127.0.0.1:8099"));
