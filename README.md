# PagerDuty Icinga2 MiddleWare

### Problem
Ack'ing an alert on PagerDuty did not _really_ acknowledge the alert on icinga2.

### Cause
PagerDuty was not sending anything to icinga2 endpoint

### Solution
- Create a Webhook on PagerDuty that will send a JSON output to an endpoint
    - https://XYZ.pagerduty.com/integrations/webhooks
    - Save the subscription key / API key, and add it to the .env file
- Event subscription
    - incident.acknowledged
    - incident.unacknowledged

- On your Icinga2 instance, clone the repo in /opt.
    - Fill in the icinga2 API username and password
    - Deploy a vhost that will reverse proxy to the node service (optional) or NAT depending on which URL or IP you added in the webhook created.
    - Copy the systemd script to /etc/systemd/system/
    - Execute a `daemon-reload`

- Make sure user nagios is present, as it's made to run by nagios.

That's it
