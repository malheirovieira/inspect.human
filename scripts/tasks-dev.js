// Em desenvolvimento não há pg_cron chamando a rota — este script faz o papel
// dele: chama /api/cron/tasks do `npm run dev` a cada 15s. Rodar num segundo
// terminal: npm run tasks:dev  (TASKS_DEV_URL muda o endereço, se precisar)
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local"), quiet: true });

const url = process.env.TASKS_DEV_URL || "http://localhost:3000/api/cron/tasks";
const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error("Defina CRON_SECRET no .env.local.");
  process.exit(1);
}

async function tick() {
  try {
    const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${secret}` } });
    const body = await res.text();
    console.log(`[${new Date().toLocaleTimeString("pt-BR")}] ${res.status} ${body}`);
  } catch (err) {
    console.log(`[${new Date().toLocaleTimeString("pt-BR")}] app fora do ar? ${err.message}`);
  }
}

tick();
setInterval(tick, 15_000);
