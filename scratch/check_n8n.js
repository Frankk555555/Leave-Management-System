const fs = require('fs');
const env = fs.readFileSync('server/.env', 'utf8');
const apiKey = env.match(/N8N_API_KEY=(.+)/)[1].trim();

async function check() {
  const ids = ['4XQ6gJPBm0jA72N3', '56kYLlXAz7lmP2wM', 'zt3OkxZKE7ndI5vz'];
  for (const id of ids) {
    const res = await fetch('https://my-leave-n8n.onrender.com/api/v1/workflows/' + id, {
      headers: { 'X-N8N-API-KEY': apiKey }
    });
    const wf = await res.json();
    console.log('=== ' + wf.name + ' (' + wf.id + ') ===');
    const str = JSON.stringify(wf.nodes);
    const matches = str.match(/https?:\/\/[^\s\\"']+/g) || [];
    console.log('URLs in nodes:', [...new Set(matches)]);
  }
}
check();
