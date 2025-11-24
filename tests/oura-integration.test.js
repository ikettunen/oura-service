const OuraAPI = require('../src/integrations/ouraApi');
const axios = require('axios');

jest.mock('axios');

describe('Oura API Integration', () => {
  const testApiKey = 'test-api-key';
  let ouraApi;

  beforeEach(() => {
    ouraApi = new OuraAPI(testApiKey);
    jest.clearAllMocks();
  });

  describe('getDailyActivity', () => {
    it('should fetch daily activity data', async () => {
      const mockResponse = {
        data: {
          data: [{
            id: 'activity-1',
            day: '2025-11-18',
            score: 85,
            steps: 8500,
            active_calories: 450,
            total_calories: 2200,
            target_calories: 500,
            met: {
              low: 120,
              medium: 60,
              high: 30
            }
          }],
          next_token: null
        }
      };

      axios.create = jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockResponse)
      });

      ouraApi = new OuraAPI(testApiKey);
      const result = await ouraApi.getDailyActivity('2025-11-18', '2025-11-18');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].steps).toBe(8500);
      expect(result.data[0].score).toBe(85);
    });

    it('should handle API errors', async () => {
      axios.create = jest.fn().mockReturnValue({
        get: jest.fn().mockRejectedValue({
          response: {
            status: 401,
            data: { message: 'Unauthorized' }
          }
        })
      });

      ouraApi = new OuraAPI(testApiKey);

      await expect(ouraApi.getDailyActivity('2025-11-18', '2025-11-18'))
        .rejects
        .toThrow('Unauthorized');
    });

    it('should handle rate limit errors', async () => {
      axios.create = jest.fn().mockReturnValue({
        get: jest.fn().mockRejectedValue({
          response: {
            status: 429,
            data: {}
          }
        })
      });

      ouraApi = new OuraAPI(testApiKey);

      await expect(ouraApi.getDailyActivity('2025-11-18', '2025-11-18'))
        .rejects
        .toThrow('Rate Limit Exceeded');
    });
  });

  describe('getDailySleep', () => {
    it('should fetch daily sleep data', async () => {
      const mockResponse = {
        data: {
          data: [{
            id: 'sleep-1',
            day: '2025-11-18',
            score: 82,
            total_sleep_duration: 28800,
            deep_sleep_duration: 7200,
            rem_sleep_duration: 5400,
            light_sleep_duration: 16200,
            efficiency: 92
          }]
        }
      };

      axios.create = jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockResponse)
      });

      ouraApi = new OuraAPI(testApiKey);
      const result = await ouraApi.getDailySleep('2025-11-18', '2025-11-18');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].score).toBe(82);
      expect(result.data[0].efficiency).toBe(92);
    });
  });

  describe('getDailyReadiness', () => {
    it('should fetch daily readiness data', async () => {
      const mockResponse = {
        data: {
          data: [{
            id: 'readiness-1',
            day: '2025-11-18',
            score: 78,
            temperature_deviation: 0.2,
            temperature_trend_deviation: 0.1
          }]
        }
      };

      axios.create = jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockResponse)
      });

      ouraApi = new OuraAPI(testApiKey);
      const result = await ouraApi.getDailyReadiness('2025-11-18', '2025-11-18');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].score).toBe(78);
      expect(result.data[0].temperature_deviation).toBe(0.2);
    });
  });

  describe('getHeartRate', () => {
    it('should fetch heart rate data', async () => {
      const mockResponse = {
        data: {
          data: [{
            bpm: 65,
            source: 'sleep',
            timestamp: '2025-11-18T08:00:00+00:00'
          }]
        }
      };

      axios.create = jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(mockResponse)
      });

      ouraApi = new OuraAPI(testApiKey);
      const result = await ouraApi.getHeartRate('2025-11-18', '2025-11-18');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].bpm).toBe(65);
    });
  });

  describe('Error Handling', () => {
    it('should handle 400 Bad Request', async () => {
      axios.create = jest.fn().mockReturnValue({
        get: jest.fn().mockRejectedValue({
          response: {
            status: 400,
            data: { message: 'Invalid date format' }
          }
        })
      });

      ouraApi = new OuraAPI(testApiKey);

      await expect(ouraApi.getDailyActivity('invalid', 'invalid'))
        .rejects
        .toThrow('Bad Request');
    });

    it('should handle 403 Forbidden', async () => {
      axios.create = jest.fn().mockReturnValue({
        get: jest.fn().mockRejectedValue({
          response: {
            status: 403,
            data: {}
          }
        })
      });

      ouraApi = new OuraAPI(testApiKey);

      await expect(ouraApi.getDailyActivity('2025-11-18', '2025-11-18'))
        .rejects
        .toThrow('Forbidden');
    });

    it('should handle network errors', async () => {
      axios.create = jest.fn().mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error('Network timeout'))
      });

      ouraApi = new OuraAPI(testApiKey);

      await expect(ouraApi.getDailyActivity('2025-11-18', '2025-11-18'))
        .rejects
        .toThrow('Network Error');
    });
  });
});
