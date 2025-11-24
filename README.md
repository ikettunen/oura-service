# Oura Service

Integration service for Oura Ring wearable device data.

## Features

- Link patients to their Oura accounts
- Fetch daily activity, sleep, and readiness data
- Webhook support for real-time data updates
- Redis caching for API keys and data
- Comprehensive test coverage

## API Endpoints

### Health Check
```
GET /health
```

### Link Patient
```
POST /api/oura/link
Body: {
  "patientId": "uuid",
  "apiKey": "personal_access_token",
  "ouraUserId": "oura_user_id" (optional)
}
```

### Get Patient Data
```
GET /api/oura/patient/:patientId
Query: startDate, endDate (optional, defaults to last 7 days)
```

### Get Patient Summary
```
GET /api/oura/patient/:patientId/summary
```

### Unlink Patient
```
DELETE /api/oura/patient/:patientId
```

### Webhook Verification (Oura calls this)
```
GET /api/oura/webhook?verification_token=xxx&challenge=xxx
```

### Webhook Handler (Oura calls this)
```
POST /api/oura/webhook
Headers:
  - x-oura-signature: HMAC signature
  - x-oura-timestamp: Unix timestamp
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```
PORT=3011
REDIS_URL=redis://localhost:6379
OURA_CLIENT_SECRET=your_client_secret
OURA_VERIFICATION_TOKEN=your_verification_token
CORS_ORIGIN=http://localhost:3000
```

3. Start the service:
```bash
npm start
```

## Development

Run with auto-reload:
```bash
npm run dev
```

Run tests:
```bash
npm test
```

## Oura API

This service integrates with Oura Ring API v2:
- Documentation: https://cloud.ouraring.com/docs/
- Base URL: https://api.ouraring.com/v2/

### Data Types
- Daily Activity: Steps, calories, activity score
- Daily Sleep: Sleep duration, stages, efficiency, score
- Daily Readiness: Readiness score, temperature, HRV
- Heart Rate: Continuous heart rate data

## Webhooks

Oura uses webhooks for real-time data updates. To set up:

1. Register your webhook URL in Oura Cloud
2. Oura will call GET /api/oura/webhook for verification
3. Oura will POST to /api/oura/webhook when data updates

## Storage

- Redis: API keys and cached data
- Fallback: File-based storage in `data/oura-keys.json`

## Testing

Test coverage includes:
- Health endpoint
- Controller unit tests
- API key management
- Oura API integration (mocked)
- Patient summary calculations
- Webhook verification and handling
