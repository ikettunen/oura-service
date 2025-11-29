const request = require('supertest');
const express = require('express');
const routes = require('../src/routes/ouraRoutes');
const keyStore = require('../src/store/keyStore');

jest.mock('../src/store/keyStore');

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.log = { info: jest.fn(), error: jest.fn() };
  next();
});
app.use('/api/oura', routes);

describe('Demo Mode Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('OURA_DEMO_KEY functionality', () => {
    test('should link patient with demo key', async () => {
      keyStore.set.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/oura/link')
        .send({
          patientId: 'demo-patient-001',
          apiKey: 'OURA_DEMO_KEY'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('linked');
      expect(keyStore.set).toHaveBeenCalled();
    });

    test('should return mock activity data with demo key', async () => {
      keyStore.get.mockResolvedValue(JSON.stringify({
        apiKey: 'OURA_DEMO_KEY',
        linkedAt: '2024-01-01'
      }));

      const response = await request(app)
        .get('/api/oura/patient/demo-patient-001')
        .expect(200);

      expect(response.body.patientId).toBe('demo-patient-001');
      expect(response.body.hasLinkedOura).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.activity).toBeDefined();
      expect(response.body.data.activity.steps).toBeGreaterThan(0);
      expect(response.body.data.sleep).toBeDefined();
      expect(response.body.data.readiness).toBeDefined();
    });

    test('should return mock summary data with demo key', async () => {
      keyStore.get.mockResolvedValue(JSON.stringify({
        apiKey: 'OURA_DEMO_KEY',
        linkedAt: '2024-01-01'
      }));

      const response = await request(app)
        .get('/api/oura/patient/demo-patient-001/summary')
        .expect(200);

      expect(response.body.patientId).toBe('demo-patient-001');
      expect(response.body.period).toBe('7 days');
      expect(response.body.summary).toBeDefined();
      expect(response.body.summary.averageSteps).toBeGreaterThan(0);
      expect(response.body.summary.averageSleepScore).toBeGreaterThan(0);
      expect(response.body.summary.averageReadinessScore).toBeGreaterThan(0);
      expect(response.body.summary.totalDays).toBeGreaterThan(0);
      expect(response.body.dailyData).toBeDefined();
      expect(response.body.dailyData.activity).toBeInstanceOf(Array);
      expect(response.body.dailyData.sleep).toBeInstanceOf(Array);
      expect(response.body.dailyData.readiness).toBeInstanceOf(Array);
    });

    test('should return mock data in batch request with demo key', async () => {
      keyStore.get.mockImplementation((key) => {
        if (key === 'oura:patient:demo-001' || key === 'oura:patient:demo-002') {
          return Promise.resolve(JSON.stringify({
            apiKey: 'OURA_DEMO_KEY',
            linkedAt: '2024-01-01'
          }));
        }
        return Promise.resolve(null);
      });

      const response = await request(app)
        .post('/api/oura/patients/batch/summary')
        .send({
          patientIds: ['demo-001', 'demo-002']
        })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].patientId).toBe('demo-001');
      expect(response.body.data[0].summary.averageSteps).toBeGreaterThan(0);
      expect(response.body.data[1].patientId).toBe('demo-002');
      expect(response.body.data[1].summary.averageSteps).toBeGreaterThan(0);
    });

    test('should generate realistic mock data values', async () => {
      keyStore.get.mockResolvedValue(JSON.stringify({
        apiKey: 'OURA_DEMO_KEY',
        linkedAt: '2024-01-01'
      }));

      const response = await request(app)
        .get('/api/oura/patient/demo-patient-001')
        .expect(200);

      const { activity, sleep, readiness } = response.body.data;

      // Validate activity data ranges
      expect(activity.steps).toBeGreaterThanOrEqual(6000);
      expect(activity.steps).toBeLessThanOrEqual(11000);
      expect(activity.activeCalories).toBeGreaterThanOrEqual(400);
      expect(activity.activeCalories).toBeLessThanOrEqual(700);
      expect(activity.totalCalories).toBeGreaterThanOrEqual(2000);
      expect(activity.totalCalories).toBeLessThanOrEqual(2500);

      // Validate sleep data ranges (in seconds)
      expect(sleep.totalSleep).toBeGreaterThanOrEqual(25200); // 7 hours
      expect(sleep.totalSleep).toBeLessThanOrEqual(32400); // 9 hours
      expect(sleep.efficiency).toBeGreaterThanOrEqual(85);
      expect(sleep.efficiency).toBeLessThanOrEqual(95);

      // Validate readiness data ranges
      expect(readiness.score).toBeGreaterThanOrEqual(70);
      expect(readiness.score).toBeLessThanOrEqual(100);
      expect(parseFloat(readiness.temperatureDeviation)).toBeGreaterThanOrEqual(-0.5);
      expect(parseFloat(readiness.temperatureDeviation)).toBeLessThanOrEqual(0.5);
    });

    test('should generate consistent data for date ranges', async () => {
      keyStore.get.mockResolvedValue(JSON.stringify({
        apiKey: 'OURA_DEMO_KEY',
        linkedAt: '2024-01-01'
      }));

      const response = await request(app)
        .get('/api/oura/patient/demo-patient-001/summary')
        .expect(200);

      const { dailyData } = response.body;

      // All arrays should have data
      expect(dailyData.activity.length).toBeGreaterThan(0);
      expect(dailyData.sleep.length).toBeGreaterThan(0);
      expect(dailyData.readiness.length).toBeGreaterThan(0);

      // Arrays should have same length (one entry per day)
      expect(dailyData.activity.length).toBe(dailyData.sleep.length);
      expect(dailyData.sleep.length).toBe(dailyData.readiness.length);

      // Each entry should have required fields
      dailyData.activity.forEach(entry => {
        expect(entry.day).toBeDefined();
        expect(entry.steps).toBeDefined();
        expect(entry.score).toBeDefined();
      });

      dailyData.sleep.forEach(entry => {
        expect(entry.day).toBeDefined();
        expect(entry.total_sleep_duration).toBeDefined();
        expect(entry.score).toBeDefined();
      });

      dailyData.readiness.forEach(entry => {
        expect(entry.day).toBeDefined();
        expect(entry.score).toBeDefined();
        expect(entry.temperature_deviation).toBeDefined();
      });
    });
  });
});
