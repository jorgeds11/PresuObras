import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { generarPropuesta, SolicitudInvalida } from "./generar";

const PORT = Number(process.env.PORT ?? 8787);

async function leerJson(req: IncomingMessage): Promise<unknown> {
  const partes: Buffer[] = [];
  let largo = 0;
  for await (const parte of req) {
    largo += parte.length;
    if (largo > 1_000_000) throw new SolicitudInvalida("La solicitud es demasiado grande.");
    partes.push(parte as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(partes).toString("utf8"));
  } catch {
    throw new SolicitudInvalida("El cuerpo no es JSON válido.");
  }
}

function responder(res: ServerResponse, estado: number, cuerpo: unknown) {
  res.writeHead(estado, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(cuerpo));
}

createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/generar") {
    try {
      const propuesta = await generarPropuesta(await leerJson(req));
      responder(res, 200, propuesta);
    } catch (err) {
      if (err instanceof SolicitudInvalida) return responder(res, 400, { error: err.message });
      console.error(err);
      responder(res, 502, { error: "No se pudo generar la propuesta. Revisá la clave de API y volvé a intentar." });
    }
    return;
  }
  responder(res, 404, { error: "No encontrado" });
}).listen(PORT, () => {
  console.log(`API de PresuObras en http://localhost:${PORT}`);
});
