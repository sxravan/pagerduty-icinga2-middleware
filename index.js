import 'dotenv/config';
import express, { response } from 'express';
import axios from 'axios';
import https from 'https';
import { api } from '@pagerduty/pdjs';

const app = express();
app.use(express.json());

function debugLog(string) {
  if (process.env.LOGLEVEL >= '2') {
    console.log(`[DEBUG] ${string}`);
  }
}

function infoLog(string) {
  if (process.env.LOGLEVEL >= '1') {
    console.log(`[INFO] ${string}`);
  }
}

// Function to get Hostname and Service name to be used to ack the alert
function getNames(apiResponseBody) {
  const alertType = apiResponseBody.details.pd_nagios_object;
  const hostName = apiResponseBody.details.HOSTDISPLAYNAME;
  let serviceName = "";

  debugLog(`Alert Type: ${alertType}`);

  if (alertType == 'service') {
    serviceName = apiResponseBody.details.SERVICENAME;
  }

  debugLog(serviceName ? `Inside getNames function - Host Name: ${hostName} Service Name: ${serviceName}` : `Inside getNames function - Host Name: ${hostName}`);

  return { hostName, serviceName };
}

// Function to send POST to Icinga2 API
async function postIcinga (eventType, { hostName, serviceName }, userName) {
  const httpsAgent = new https.Agent({ rejectUnauthorized: false });
  let endPoint = '';
  let body = '';

  debugLog(`Inside postIcinga function - Event type: ${eventType}. host.name=="${hostName}"` + (serviceName ? `&&service.name=="${serviceName}"` : ""));
  debugLog(`Username: ${userName}`);
  if (eventType == "incident.acknowledged") {
    endPoint = '/acknowledge-problem';
    body = {
      "type": serviceName ? "Service" : "Host",
      "filter": `host.name=="${hostName}"` + (serviceName ? `&&service.name=="${serviceName}"` : ""),
      "author": `${userName}`,
      "comment": `Incident has been acknowledged by ${userName}.`,
      "notify": true,
      "pretty": true
    };
  } else if (eventType == "incident.unacknowledged") {
    endPoint = '/remove-acknowledgement';
    serviceName ? body = { "service": `${hostName}!${serviceName}`, "pretty": true } : body = { "host": `${hostName}`, "pretty": true };
  }

  debugLog(`Endpoint: ${endPoint}`);
  debugLog(`Body: ${JSON.stringify(body, null, 2)}`);

  // Sending POST request to the Icinga API
  try {
    const fullURL = `${process.env.BASEURL}${endPoint}`;

    const response = await axios.post(fullURL, body,
      {
        auth: {
          username: process.env.ICINGA_API_USERNAME,
          password: process.env.ICINGA_API_PASSWORD
        },
        headers: {
          'Accept': 'application/json'
        },
        httpsAgent: httpsAgent
      })
      .then(response => {
        infoLog(`Response: ${response.data.results[0].status}`);
      });
  }
  catch (error) {
    debugLog(error);
  }
}

// Endpoint to receive PagerDuty webhooks
app.post('/update', async (req, res) => {

  const eventType = req.body.event.event_type;
  const userName = req.body.event.agent.summary;

  // Check if event_type is 'acknowledged'
  if (eventType == 'incident.acknowledged' || eventType == 'incident.unacknowledged') {
    const pd = api({ token: process.env.PAGERDUTY_API_TOKEN });
    const eventId = req.body.event.data.id;

    pd.get(`/incidents/${eventId}/alerts`)
      .then((response) => {
        postIcinga(eventType, getNames(response.data.alerts[0].body), userName);
      })
      .catch(console.error);
  }

  res.sendStatus(200);
});

app.get('/health', (req, res) => {
  // for AWS health checks
  res.sendStatus(200);
});

// Start the server
app.listen(process.env.PORT, process.env.ADDR, () => {
  infoLog(`Server is listening on port ${process.env.PORT}`);
});