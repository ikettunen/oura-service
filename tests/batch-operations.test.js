const request = require('supertest');
const express = require('express');
const routes = require('../src/routes/ouraRoutes');
const keyStore = require('../src/store/keyStore');
const OuraAPI = require('../src/integrations/ouraApi');

jest.mock('../src/store/keyStore');
jest.mock('../src/integrations/ouraApi');

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.log = { info: jest.fn(), error: jest.fn() };
  next();
});
app.use('/api/oura', routes);

describe('Batch Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/oura/patients/batch/summary', () => {
    test('should return summaries for multiple patients', async () => {
      // Mock keyStore to return data for patients
      keyStore.get.mockImplementation((key) => {
        if (key === 'oura:patient:P0001') {
          return Promise.resolve(JSON.stringify({ apiKey: 'key1', linkedAt: '2024-01-01' }));
        }
        if (key === 'oura:patient:P0002') {
          return Promise.resolve(JSON.stringify({ apiKey: 'key2', linkedAt: '2024-01-01' }));
        }
        return Promise.resolve(null);
      });

      // Mock OuraAPI responses
      OuraAPI.prototype.getDailyActivity = jest.fn().mockResolvedValue({
        data: [
          { steps: 8000, day: '2024-01-01' },
          { steps: 9000, day: '2024-01-02' }
        ]
      });

      OuraAPI.prototype.getDailySleep = jest.fn().mockResolvedValue({
        data: [
          { score: 80, day: '2024-01-01' },
          { score: 85, day: '2024-01-02' }
        ]
      });

      OuraAPI.prototype.getDailyReadiness = jest.fn().mockResolvedValue({
        data: [
          { score: 75, day: '2024-01-01' },
          { score: 78, day: '2024-01-02' }
        ]
      });

      const response = await request(app)
        .post('/api/oura/patients/batch/summary')
        .send({ patientIds: ['P0001', 'P0002'] })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].patientId).toBe('P0001');
      expect(response.body.data[0].summary.averageSteps).toBe(8500);
      expect(response.body.data[1].patientId).toBe('P0002');
    });

    test('should validate patientIds array', async () => {
      // Missing patientIds
      let response = await request(app)
        .post('/api/oura/patients/batch/summary')
        .send({})
        .expect(400);

      expect(response.body.error.message).toBe('patientIds array required');

      // patientIds is not an array
      response = await request(app)
        .post('/api/oura/patients/batch/summary')
        .send({ patientIds: 'P0001' })
        .expect(400);

      expect(response.body.error.message).toBe('patientIds array required');
    });

    test('should handle partial failures gracefully', async () => {
      // Mock keyStore to return data only for P0001
      keyStore.get.mockImplementation((key) => {
        if (key === 'oura:patient:P0001') {
          return Promise.resolve(JSON.stringify({ apiKey: 'key1', linkedAt: '2024-01-01' }));
        }
        return Promise.resolve(null);
      });

      // Mock OuraAPI responses
      OuraAPI.prototype.getDailyActivity = jest.fn().mockResolvedValue({
        data: [{ steps: 8000, day: '2024-01-01' }]
      });

      OuraAPI.prototype.getDailySleep = jest.fn().mockResolvedValue({
        data: [{ score: 80, day: '2024-01-01' }]
      });

      OuraAPI.prototype.getDailyReadiness = jest.fn().mockResolvedValue({
        data: [{ score: 75, day: '2024-01-01' }]
      });

      const response = await request(app)
        .post('/api/oura/patients/batch/summary')
        .send({ patientIds: ['P0001', 'P0002', 'P0003'] })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].patientId).toBe('P0001');
      expect(response.body.errors).toHaveLength(2);
      expect(response.body.errors[0].patientId).toBe('P0002');
      expect(response.body.errors[0].error).toBe('Patient not linked to Oura account');
    });

    test('should handle API errors for individual patients', async () => {
      keyStore.get.mockImplementation((key) => {
        if (key === 'oura:patient:P0001') {
          return Promise.resolve(JSON.stringify({ apiKey: 'key1', linkedAt: '2024-01-01' }));
        }
        if (key === 'oura:patient:P0002') {
          return Promise.resolve(JSON.stringify({ apiKey: 'key2', linkedAt: '2024-01-01' }));
        }
        return Promise.resolve(null);
      });

      // Mock OuraAPI to fail for P0002
      let callCount = 0;
      OuraAPI.prototype.getDailyActivity = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: [{ steps: 8000, day: '2024-01-01' }] });
        }
        return Promise.reject(new Error('API rate limit exceeded'));
      });

      OuraAPI.prototype.getDailySleep = jest.fn().mockResolvedValue({
        data: [{ score: 80, day: '2024-01-01' }]
      });

      OuraAPI.prototype.getDailyReadiness = jest.fn().mockResolvedValue({
        data: [{ score: 75, day: '2024-01-01' }]
      });

      const response = await request(app)
        .post('/api/oura/patients/batch/summary')
        .send({ patientIds: ['P0001', 'P0002'] })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].patientId).toBe('P0001');
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0].patientId).toBe('P0002');
      expect(response.body.errors[0].error).toBe('API rate limit exceeded');
    });
  });
});
