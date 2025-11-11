import express from "express";
import QRCode from "qrcode";
import { Client, LocalAuth } from "whatsapp-web.js";

const app = express();
const PORT = process.env.PORT || 3000;

let qrCodeUrl = "QR no generado aún";
let giveaways = {}; // { id: { emoji, participantes: [] } }

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

// 📲 Generar QR para conectar
client.on("qr", async (qr) => {
  qrCodeUrl = await QRCode.toDataURL(qr);
  console.log("✅ Escanea el QR en /qr para conectar tu WhatsApp");
});

// 🤖 Confirmación de conexión
client.on("ready", () => {
  console.log("🤖 Bot conectado correctamente a WhatsApp");
});

// 🎁 Crear giveaway
client.on("message_create", async (msg) => {
  if (!msg.body.startsWith("!giveaway")) return;

  const args = msg.body.split(" ");
  const emoji = args[1] || "❤️";
  const id = Date.now().toString();

  giveaways[id] = { emoji, participantes: [] };

  await msg.reply(`🎉 *Nuevo sorteo iniciado!*  
Reacciona enviando el emoji ${emoji} para participar.  
(Escribe solo ese emoji en el chat.)`);
});

// 🧍‍♂️ Participación por emoji
client.on("message", async (msg) => {
  for (const id in giveaways) {
    const { emoji, participantes } = giveaways[id];

    if (msg.body.trim() === emoji && !participantes.includes(msg.from)) {
      participantes.push(msg.from);
      await msg.reply(`✅ Te uniste al sorteo con ${emoji}! Suerte 🍀`);
    }
  }

  // 🏆 Elegir ganador manualmente
  if (msg.body === "!ganador") {
    for (const id in giveaways) {
      const { participantes } = giveaways[id];
      if (participantes.length === 0) {
        await msg.reply("⚠️ No hay participantes todavía.");
        return;
      }

      const ganador = participantes[Math.floor(Math.random() * participantes.length)];
      await msg.reply(`🏆 ¡El ganador es @${ganador.split("@")[0]}! 🎉`, { mentions: [ganador] });
    }
  }

  // ❌ Reiniciar todos los sorteos (solo admin)
  if (msg.body === "!resetgiveaway") {
    giveaways = {};
    await msg.reply("♻️ Todos los giveaways fueron eliminados.");
  }
});

// 🌐 Servidor web para mostrar QR
app.get("/", (req, res) => {
  res.send("<h2>Bot WhatsApp funcionando ✅</h2><p>Visita <a href='/qr'>/qr</a> para escanear el QR.</p>");
});

app.get("/qr", (req, res) => {
  res.send(`<img src="${qrCodeUrl}" style="width:300px"/>`);
});

client.initialize();
app.listen(PORT, () => console.log(`🌐 Servidor iniciado en puerto ${PORT}`));
