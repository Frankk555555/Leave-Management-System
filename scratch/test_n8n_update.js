const fs = require('fs');

const env = fs.readFileSync('server/.env', 'utf8');
const apiKey = env.match(/N8N_API_KEY=(.+)/)[1].trim();

async function updateWorkflow(id, localFile) {
  const content = JSON.parse(fs.readFileSync(localFile, 'utf8'));
  
  const payload = {
    name: content.name,
    nodes: content.nodes,
    connections: content.connections,
    settings: {
      executionOrder: 'v1'
    }
  };

  const putRes = await fetch(`https://my-leave-n8n.onrender.com/api/v1/workflows/${id}`, {
    method: 'PUT',
    headers: {
      'X-N8N-API-KEY': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const resData = await putRes.json();
  if (putRes.ok) {
    console.log(`Successfully updated ${id} (${payload.name})`);
  } else {
    console.error(`Error updating ${id}:`, resData);
  }
}

async function run() {
  console.log('Testing update on 4XQ6gJPBm0jA72N3...');
  await updateWorkflow('4XQ6gJPBm0jA72N3', 'Leave_Created_Notification__Admin_.json');
}

run();
