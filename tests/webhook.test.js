const request = require('supertest');
const app = require('../src/server');
const crypto = require('crypto');

describe('Webhook Endpoints', () => {
  const verificationToken = process.env.OURA_VERIFICATION_TOKEN || 'test-verification-token';
  const clientSecret = process.env.OURA_CLIENT_SECRET || 'test-client-secret';

  describe('GET /api/oura/webhook', () => {
    it('should verify webhook with correct token', async () => {
      const challenge = 'test-challenge-123';

      const response = await request(app)
        .get('/api/oura/webhook')
        .query({
          verification_token: verificationToken,
          challenge: challenge
        })
        .expect(200);

      expect(response.body).toHaveProperty('challenge', challenge);
    });

    it('should reject webhook with incorrect token', async () => {
      const response = await request(app)
        .get('/api/oura/webhook')
        .query({
          verification_token: 'wrong-token',
          challenge: 'test-challenge'
        })
        .expect(401);

      expect(response.text).toContain('Invalid verification token');
    });
  });

  describe('POST /api/oura/webhook', () => {
    it('should accept webhook with valid signature', async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const payload = {
        event_type: 'create',
        data_type: 'daily_activity',
        object_id: 'activity-123',
        user_id: 'user-456'
      };

      // Calculate HMAC signature
      const hmac = crypto.createHmac('sha256', clientSecret);
      hmac.update(timestamp + JSON.stringify(payload));
      const signature = hmac.digest('hex').toUpperCase();

      const response = await request(app)
        .post('/api/oura/webhook')
        .set('x-oura-signature', signature)
        .set('x-oura-timestamp', timestamp)
        .send(payload)
        .expect(200);

      expect(response.text).toBe('OK');
    });

    it('should reject webhook with invalid signature', async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const payload = {
        event_type: 'create',
        data_type: 'daily_activity',
        object_id: 'activity-123',
        user_id: 'user-456'
      };

      const response = await request(app)
        .post('/api/oura/webhook')
        .set('x-oura-signature', 'INVALID_SIGNATURE')
        .set('x-oura-timestamp', timestamp)
        .send(payload)
        .expect(401);

      expect(response.text).toContain('Invalid signature');
    });

    it('should handle different event types', async () => {
      const eventTypes = ['create', 'update', 'delete'];
      const dataTypes = ['daily_activity', 'daily_sleep', 'daily_readiness', 'heartrate'];

      for (const eventType of eventTypes) {
        for (const dataType of dataTypes) {
          const timestamp = Math.floor(Date.now() / 1000).toString();
          const payload = {
            event_type: eventType,
            data_type: dataType,
            object_id: `${dataType}-123`,
            user_id: 'user-456'
          };

          const hmac = crypto.createHmac('sha256', clientSecret);
          hmac.update(timestamp + JSON.stringify(payload));
          const signature = hmac.digest('hex').toUpperCase();

          await request(app)
            .post('/api/oura/webhook')
            .set('x-oura-signature', signature)
            .set('x-oura-timestamp', timestamp)
            .send(payload)
            .expect(200);
        }
      }
    });
  });
});
