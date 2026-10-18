import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { generarPropuesta, SolicitudInvalida } from "../../server/generar";

const anthropicKey = defineSecret("ANTHROPIC_API_KEY");

/** POST /api/generar: el mismo endpoint que server/index.ts, publicado como Cloud Function. */
export const generar = onRequest({ secrets: [anthropicKey], timeoutSeconds: 300, region: "us-central1" }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }
  try {
    res.json(await generarPropuesta(req.body));
  } catch (err) {
    if (err instanceof SolicitudInvalida) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(502).json({ error: "No se pudo generar la propuesta. Volvé a intentar." });
  }
});
