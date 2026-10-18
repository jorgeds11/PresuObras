// Genera dist/demo.html: la app en un solo archivo (JS y CSS embebidos)
// para publicarla como página de prueba. Correr después de `npm run build`.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const assets = readdirSync("dist/assets");
const leer = (ext) => readFileSync(`dist/assets/${assets.find((f) => f.endsWith(ext))}`, "utf8");
const js = leer(".js").replace(/<\/script/gi, "<\\/script");
const css = leer(".css").replace(/<\/style/gi, "<\\/style");

writeFileSync(
  "dist/demo.html",
  `<title>PresuObras</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>${css}</style>
<div id="root"></div>
<script type="module">${js}</script>
`,
);
console.log("dist/demo.html listo");
