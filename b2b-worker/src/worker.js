const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Klient backend-to-backend (bez interfejsu i bez użytkownika).
// OAuth2 Client Credentials: service account klienta b2b-client.
// Cyklicznie pobiera statystyki z Resource Servera i zapisuje raport.

const cfg = {
  tokenUrl: process.env.OIDC_TOKEN_URL,
  clientId: process.env.OIDC_CLIENT_ID,
  clientSecret: process.env.OIDC_CLIENT_SECRET,
  apiBase: process.env.API_BASE,
  intervalMs: Number(process.env.INTERVAL_MS || 60000),
  reportDir: process.env.REPORT_DIR,
};

// Pobranie access tokenu w flow Client Credentials
async function getToken() {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
  });
  const { data } = await axios.post(cfg.tokenUrl, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data.access_token;
}

async function runOnce() {
  try {
    const token = await getToken();
    const { data: stats } = await axios.get(`${cfg.apiBase}/api/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const stamp = new Date().toISOString();
    console.log(`[b2b] ${stamp} statystyki:`, JSON.stringify(stats));

    fs.mkdirSync(cfg.reportDir, { recursive: true });
    const file = path.join(cfg.reportDir, `stats-${stamp.replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(file, JSON.stringify({ generatedAt: stamp, stats }, null, 2));
    console.log(`[b2b] Zapisano raport: ${file}`);
  } catch (err) {
    console.error('[b2b] Błąd:', err.response?.status, err.response?.data || err.message);
  }
}

console.log(`Klient B2B startuje. Interwał: ${cfg.intervalMs} ms`);
runOnce();
setInterval(runOnce, cfg.intervalMs);
