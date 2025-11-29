/**
 * Mock Oura Data Generator
 * Returns realistic mock data for testing without real API keys
 */

/**
 * Generate mock daily activity data
 */
function generateMockActivity(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const data = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    data.push({
      id: `activity-${dateStr}`,
      day: dateStr,
      score: Math.floor(Math.random() * 30) + 70, // 70-100
      active_calories: Math.floor(Math.random() * 300) + 400, // 400-700
      total_calories: Math.floor(Math.random() * 500) + 2000, // 2000-2500
      steps: Math.floor(Math.random() * 5000) + 6000, // 6000-11000
      equivalent_walking_distance: Math.floor(Math.random() * 5000) + 5000,
      high_activity_time: Math.floor(Math.random() * 3600) + 1800,
      medium_activity_time: Math.floor(Math.random() * 7200) + 3600,
      low_activity_time: Math.floor(Math.random() * 10800) + 7200,
      non_wear_time: Math.floor(Math.random() * 3600),
      resting_time: Math.floor(Math.random() * 28800) + 28800,
      sedentary_time: Math.floor(Math.random() * 21600) + 14400,
      timestamp: `${dateStr}T00:00:00+00:00`
    });
  }

  return { data, next_token: null };
}

/**
 * Generate mock daily sleep data
 */
function generateMockSleep(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const data = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const totalSleep = Math.floor(Math.random() * 7200) + 25200; // 7-9 hours in seconds
    const deepSleep = Math.floor(totalSleep * (Math.random() * 0.1 + 0.15)); // 15-25% of total
    const remSleep = Math.floor(totalSleep * (Math.random() * 0.1 + 0.20)); // 20-30% of total
    const lightSleep = totalSleep - deepSleep - remSleep;

    data.push({
      id: `sleep-${dateStr}`,
      day: dateStr,
      score: Math.floor(Math.random() * 30) + 70, // 70-100
      total_sleep_duration: totalSleep,
      deep_sleep_duration: deepSleep,
      light_sleep_duration: lightSleep,
      rem_sleep_duration: remSleep,
      awake_time: Math.floor(Math.random() * 1800) + 600, // 10-40 minutes
      efficiency: Math.floor(Math.random() * 10) + 85, // 85-95%
      latency: Math.floor(Math.random() * 900) + 300, // 5-20 minutes
      timing: Math.floor(Math.random() * 100) + 50,
      timestamp: `${dateStr}T00:00:00+00:00`
    });
  }

  return { data, next_token: null };
}

/**
 * Generate mock daily readiness data
 */
function generateMockReadiness(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const data = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    data.push({
      id: `readiness-${dateStr}`,
      day: dateStr,
      score: Math.floor(Math.random() * 30) + 70, // 70-100
      temperature_deviation: (Math.random() * 1.0 - 0.5).toFixed(2), // -0.5 to +0.5
      temperature_trend_deviation: (Math.random() * 0.4 - 0.2).toFixed(2),
      activity_balance: Math.floor(Math.random() * 30) + 70,
      body_temperature: (36.5 + Math.random() * 0.5).toFixed(2),
      hrv_balance: Math.floor(Math.random() * 30) + 70,
      previous_day_activity: Math.floor(Math.random() * 30) + 70,
      previous_night: Math.floor(Math.random() * 30) + 70,
      recovery_index: Math.floor(Math.random() * 30) + 70,
      resting_heart_rate: Math.floor(Math.random() * 20) + 50, // 50-70 bpm
      sleep_balance: Math.floor(Math.random() * 30) + 70,
      timestamp: `${dateStr}T00:00:00+00:00`
    });
  }

  return { data, next_token: null };
}

/**
 * Generate mock heart rate data
 */
function generateMockHeartRate(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const data = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    
    // Generate hourly heart rate data
    for (let hour = 0; hour < 24; hour++) {
      const timestamp = `${dateStr}T${hour.toString().padStart(2, '0')}:00:00+00:00`;
      data.push({
        bpm: Math.floor(Math.random() * 40) + 60, // 60-100 bpm
        source: 'ring',
        timestamp
      });
    }
  }

  return { data, next_token: null };
}

module.exports = {
  generateMockActivity,
  generateMockSleep,
  generateMockReadiness,
  generateMockHeartRate
};
