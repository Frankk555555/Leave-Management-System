const fs = require('fs');

const env = fs.readFileSync('server/.env', 'utf8');
const apiKey = env.match(/N8N_API_KEY=(.+)/)[1].trim();
const baseUrl = 'https://my-leave-n8n.onrender.com';

const workflowsToUpdate = [
  {
    id: '4XQ6gJPBm0jA72N3',
    file: 'Leave_Created_Notification__Admin_.json',
    expectedName: 'Leave Created Notification (Admin)'
  },
  {
    id: '56kYLlXAz7lmP2wM',
    file: 'Weekly_Report_with_Graphs.json',
    expectedName: 'Weekly Report with Graphs'
  },
  {
    id: 'zt3OkxZKE7ndI5vz',
    file: 'Leave_Status_Notification__Requester_.json',
    expectedName: 'Leave Status Notification (Requester & Approver)'
  }
];

async function syncWorkflow(item) {
  const content = JSON.parse(fs.readFileSync(item.file, 'utf8'));
  
  const payload = {
    name: content.name || item.expectedName,
    nodes: content.nodes,
    connections: content.connections,
    settings: {
      executionOrder: 'v1'
    }
  };

  const putRes = await fetch(`${baseUrl}/api/v1/workflows/${item.id}`, {
    method: 'PUT',
    headers: {
      'X-N8N-API-KEY': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const resData = await putRes.json();
  if (putRes.ok) {
    console.log(`[OK] Updated ${item.id} -> ${payload.name}`);
    
    // Ensure active
    if (!resData.active) {
      const activateRes = await fetch(`${baseUrl}/api/v1/workflows/${item.id}/activate`, {
        method: 'POST',
        headers: { 'X-N8N-API-KEY': apiKey }
      });
      if (activateRes.ok) {
        console.log(`[OK] Activated ${item.id}`);
      }
    } else {
      console.log(`[OK] Workflow ${item.id} is active`);
    }
  } else {
    console.error(`[FAIL] Error updating ${item.id}:`, resData);
  }
}

async function run() {
  console.log('Starting sync to ' + baseUrl + '...');
  for (const item of workflowsToUpdate) {
    await syncWorkflow(item);
  }
  console.log('Sync completed!');
}

run();
