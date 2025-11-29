const axios = require('axios');
const mockData = require('./mockOuraData');

const OURA_API_BASE_URL = 'https://api.ouraring.com/v2';
const DEMO_API_KEY = 'OURA_DEMO_KEY';

/**
 * Oura API Integration
 * Handles communication with Oura Ring API v2
 * 
 * Special: Use API key "OURA_DEMO_KEY" to get mock data for testing
 */
class OuraAPI {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.isDemoMode = accessToken === DEMO_API_KEY;
    
    if (!this.isDemoMode) {
      this.client = axios.create({
        baseURL: OURA_API_BASE_URL,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
    }
  }

  /**
   * Get daily activity data for a date range
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Object>} Daily activity data
   */
  async getDailyActivity(startDate, endDate) {
    if (this.isDemoMode) {
      return Promise.resolve(mockData.generateMockActivity(startDate, endDate));
    }
    
    try {
      const response = await this.client.get('/usercollection/daily_activity', {
        params: {
          start_date: startDate,
          end_date: endDate
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching daily activity:', error.message);
      throw this._handleError(error);
    }
  }

  /**
   * Get a single daily activity document by ID
   * @param {string} documentId - Document ID
   * @returns {Promise<Object>} Daily activity document
   */
  async getDailyActivityById(documentId) {
    if (this.isDemoMode) {
      // Extract date from document ID (format: activity-YYYY-MM-DD)
      const dateMatch = documentId.match(/activity-(\d{4}-\d{2}-\d{2})/);
      const date = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];
      const mockResponse = mockData.generateMockActivity(date, date);
      return Promise.resolve(mockResponse.data[0] || {});
    }
    
    try {
      const response = await this.client.get(`/usercollection/daily_activity/${documentId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching daily activity by ID:', error.message);
      throw this._handleError(error);
    }
  }

  /**
   * Get daily sleep data for a date range
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Object>} Daily sleep data
   */
  async getDailySleep(startDate, endDate) {
    if (this.isDemoMode) {
      return Promise.resolve(mockData.generateMockSleep(startDate, endDate));
    }
    
    try {
      const response = await this.client.get('/usercollection/daily_sleep', {
        params: {
          start_date: startDate,
          end_date: endDate
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching daily sleep:', error.message);
      throw this._handleError(error);
    }
  }

  /**
   * Get daily readiness data for a date range
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Object>} Daily readiness data
   */
  async getDailyReadiness(startDate, endDate) {
    if (this.isDemoMode) {
      return Promise.resolve(mockData.generateMockReadiness(startDate, endDate));
    }
    
    try {
      const response = await this.client.get('/usercollection/daily_readiness', {
        params: {
          start_date: startDate,
          end_date: endDate
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching daily readiness:', error.message);
      throw this._handleError(error);
    }
  }

  /**
   * Get heart rate data for a date range
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Object>} Heart rate data
   */
  async getHeartRate(startDate, endDate) {
    if (this.isDemoMode) {
      return Promise.resolve(mockData.generateMockHeartRate(startDate, endDate));
    }
    
    try {
      const response = await this.client.get('/usercollection/heartrate', {
        params: {
          start_date: startDate,
          end_date: endDate
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching heart rate:', error.message);
      throw this._handleError(error);
    }
  }

  /**
   * Handle API errors
   * @private
   */
  _handleError(error) {
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          return new Error(`Bad Request: ${data.message || 'Invalid parameters'}`);
        case 401:
          return new Error('Unauthorized: Access token expired or invalid');
        case 403:
          return new Error('Forbidden: User subscription expired or data not available');
        case 404:
          return new Error('Not Found: Resource does not exist');
        case 422:
          return new Error(`Validation Error: ${JSON.stringify(data)}`);
        case 429:
          return new Error('Rate Limit Exceeded: Too many requests');
        default:
          return new Error(`Oura API Error: ${status} - ${data.message || 'Unknown error'}`);
      }
    }
    
    return new Error(`Network Error: ${error.message}`);
  }
}

module.exports = OuraAPI;
