# AWS SOC Dashboard

Real-Time Security Operations Center dashboard connected to AWS CloudTrail via Athena.

## Setup

```bash
npm install
node backend/server.js
```

Requires AWS credentials configured at `~/.aws/credentials` with access to:
- Athena (soc_logs database, cloudtrail_logs table)
- S3 (soc-logs-jui-123 bucket)

Open `http://localhost:3000`
