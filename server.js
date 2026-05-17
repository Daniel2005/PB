const http = require("http");
const https = require("https");

const BOT_TOKEN = "8666864449:AAHN3vctMPU3Y0nyu7qqhKP3EmNiKFaFTdM";
const CHAT_ID = "5092675661";
const PORT = process.env.PORT || 3000;

function sendTelegram(message) {
  const body = JSON.stringify({
    chat_id: CHAT_ID,
    text: message,
    parse_mode: "HTML",
  });

  const options = {
    hostname: "api.telegram.org",
    path: `/bot${BOT_TOKEN}/sendMessage`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(JSON.parse(data)));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  // Health check
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200);
    res.end("Paddy Trading Bot is running ✅");
    return;
  }

  // Webhook endpoint for TradingView
  if (req.method === "POST" && req.url === "/webhook") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        console.log("Received alert:", body);

        let message = "";

        // Try to parse as JSON first (structured alert)
        try {
          const data = JSON.parse(body);
          const symbol = data.symbol || "Unknown";
          const action = data.action || "SIGNAL";
          const price = data.price || "N/A";
          const timeframe = data.timeframe || "";
          const note = data.note || "";

          const emoji = action.toUpperCase().includes("BUY") ? "🟢" : 
                        action.toUpperCase().includes("SELL") ? "🔴" : "⚡";

          message = `${emoji} <b>${action.toUpperCase()}</b> — ${symbol}
💰 Price: <b>${price}</b>
${timeframe ? `⏱ Timeframe: ${timeframe}\n` : ""}${note ? `📝 ${note}` : ""}
🕐 ${new Date().toUTCString()}`;

        } catch {
          // Plain text alert from TradingView
          message = `⚡ <b>TRADE ALERT</b>\n\n${body}\n\n🕐 ${new Date().toUTCString()}`;
        }

        await sendTelegram(message);
        res.writeHead(200);
        res.end("OK");
      } catch (err) {
        console.error("Error:", err);
        res.writeHead(500);
        res.end("Error");
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`Paddy Trading Bot running on port ${PORT}`);
  // Send startup message to Telegram
  sendTelegram("🤖 <b>Paddy Trading Bot is online!</b>\n\nWaiting for TradingView alerts...")
    .then(() => console.log("Startup message sent to Telegram"))
    .catch(console.error);
});
