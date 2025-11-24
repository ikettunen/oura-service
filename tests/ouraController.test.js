const request = require('supertest');
const app = require('../src/server');
const keyStore = require('../src/store/keyStore');
const OuraAPI = require('../src/integrations/ouraApi');

// Mock the OuraAPI
jest.mock('../src/integrations/ouraApi');

describe('Oura Controller', () => {
  const testPatientId = 'test-patient-123';
  const testApiKey = 'test-api-key-456';
  const testOuraUserId = 'oura-user-789';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up test data
    await keyStore.del(`oura:patient:${testPatientId}`);
  });

  describe('POST /api/oura/link', () => {
    it('should link a patient to Oura account', async () => {
      const response = await request(app)
        .post('/api/oura/link')
        .send({
          patientId: testPatientId,
          apiKey: testApiKey,
          ouraUserId: testOuraUserId
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('patientId', testPatientId);
      expect(response.body.message).toContain('linked');

      // Verify data was stored
      const stored = await keyStore.get(`oura:patient:${testPatientId}`);
      expect(stored).toBeTruthy();
      const data = JSON.parse(stored);
      expect(data.apiKey).toBe(testApiKey);
      expect(data.ouraUserId).toBe(testOuraUserId);
    });

    it('should return 400 if patientId is missing', async () => {
      const response = await request(app)
        .post('/api/oura/link')
        .send({ apiKey: testApiKey })
        .expect(400);

      expect(response.body.error.message).toContain('patientId and apiKey required');
    });

    it('should return 400 if apiKey is missing', async () => {
      const response = await request(app)
        .post('/api/oura/link')
        .send({ patientId: testPatientId })
        .expect(400);

      expect(response.body.error.message).toContain('patientId and apiKey required');
    });
  });

  describe('GET /api/oura/patient/:patientId', () => {
    beforeEach(async () => {
      // Link patient before testing
      await keyStore.set(
        `oura:patient:${testPatientId}`,
        JSON.stringify({
          apiKey: testApiKey,
          ouraUserId: testOuraUserId,
          linkedAt: new Date().toISOString()
        })
      );
    });

    it('should get patient Oura data', async () => {
      // Mock Oura API responses
      const mockActivity = {
        data: [{
          day: '2025-11-18',
          steps: 8500,
          active_calories: 450,
          total_calories: 2200,
          score: 85
        }]
      };

      const mockSleep = {
        data: [{
          day: '2025-11-18',
          total_sleep_duration: 28800,
          deep_sleep_duration: 7200,
          rem_sleep_duration: 5400,
          score: 82,
          efficiency: 92
        }]
      };

      const mockReadiness = {
        data: [{
          day: '2025-11-18',
          score: 78,
          temperature_deviation: 0.2
        }]
      };

      OuraAPI.prototype.getDailyActivity = jest.fn().mockResolvedValue(mockActivity);
      OuraAPI.prototype.getDailySleep = jest.fn().mockResolvedValue(mockSleep);
      OuraAPI.prototype.getDailyReadiness = jest.fn().mockResolvedValue(mockReadiness);

      const response = await request(app)
        .get(`/api/oura/patient/${testPatientId}`)
        .expect(200);

      expect(response.body).toHaveProperty('patientId', testPatientId);
      expect(response.body).toHaveProperty('hasLinkedOura', true);
      expect(response.body.data.activity.steps).toBe(8500);
      expect(response.body.data.sleep.score).toBe(82);
      expect(response.body.data.readiness.score).toBe(78);
    });

    it('should return 404 if patient not linked', async () => {
      const response = await request(app)
        .get('/api/oura/patient/non-existent-patient')
        .expect(404);

      expect(response.body.error.message).toContain('not linked');
    });

    it('should handle API errors gracefully', async () => {
      OuraAPI.prototype.getDailyActivity = jest.fn().mockRejectedValue(new Error('API Error'));
      OuraAPI.prototype.getDailySleep = jest.fn().mockResolvedValue({ data: [] });
      OuraAPI.prototype.getDailyReadiness = jest.fn().mockResolvedValue({ data: [] });

      const response = await request(app)
        .get(`/api/oura/patient/${testPatientId}`)
        .expect(200);

      // Should still return data with empty activity
      expect(response.body.data.activity.steps).toBe(0);
    });
  });

  describe('GET /api/oura/patient/:patientId/summary', () => {
    beforeEach(async () => {
      await keyStore.set(
        `oura:patient:${testPatientId}`,
        JSON.stringify({
          apiKey: testApiKey,
          ouraUserId: testOuraUserId,
          linkedAt: new Date().toISOString()
        })
      );
    });

    it('should get patient 7-day summary', async () => {
      const mockActivity = {
        data: [
          { day: '2025-11-12', steps: 8000 },
          { day: '2025-11-13', steps: 9000 },
          { day: '2025-11-14', steps: 7500 },
          { day: '2025-11-15', steps: 10000 },
          { day: '2025-11-16', steps: 8500 },
          { day: '2025-11-17', steps: 9500 },
          { day: '2025-11-18', steps: 8500 }
        ]
      };

      const mockSleep = {
        data: [
          { day: '2025-11-12', score: 80 },
          { day: '2025-11-13', score: 85 },
          { day: '2025-11-14', score: 78 },
          { day: '2025-11-15', score: 82 },
          { day: '2025-11-16', score: 88 },
          { day: '2025-11-17', score: 84 },
          { day: '2025-11-18', score: 86 }
        ]
      };

      const mockReadiness = {
        data: [
          { day: '2025-11-12', score: 75 },
          { day: '2025-11-13', score: 80 },
          { day: '2025-11-14', score: 72 },
          { day: '2025-11-15', score: 78 },
          { day: '2025-11-16', score: 82 },
          { day: '2025-11-17', score: 79 },
          { day: '2025-11-18', score: 81 }
        ]
      };

      OuraAPI.prototype.getDailyActivity = jest.fn().mockResolvedValue(mockActivity);
      OuraAPI.prototype.getDailySleep = jest.fn().mockResolvedValue(mockSleep);
      OuraAPI.prototype.getDailyReadiness = jest.fn().mockResolvedValue(mockReadiness);

      const response = await request(app)
        .get(`/api/oura/patient/${testPatientId}/summary`)
        .expect(200);

      expect(response.body).toHaveProperty('patientId', testPatientId);
      expect(response.body).toHaveProperty('period', '7 days');
      expect(response.body.summary.averageSteps).toBe(8714); // Average of steps
      expect(response.body.summary.totalDays).toBe(7);
      expect(response.body.dailyData.activity).toHaveLength(7);
    });

    it('should return 404 if patient not linked', async () => {
      const response = await request(app)
        .get('/api/oura/patient/non-existent-patient/summary')
        .expect(404);

      expect(response.body.error.message).toContain('not linked');
    });
  });

  describe('DELETE /api/oura/patient/:patientId', () => {
    beforeEach(async () => {
      await keyStore.set(
        `oura:patient:${testPatientId}`,
        JSON.stringify({
          apiKey: testApiKey,
          ouraUserId: testOuraUserId,
          linkedAt: new Date().toISOString()
        })
      );
    });

    it('should unlink patient from Oura account', async () => {
      const response = await request(app)
        .delete(`/api/oura/patient/${testPatientId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('unlinked');

      // Verify data was deleted
      const stored = await keyStore.get(`oura:patient:${testPatientId}`);
      expect(stored).toBeNull();
    });
  });
});
