const OuraAPI = require('../integrations/ouraApi');
const keyStore = require('../store/keyStore');
const crypto = require('crypto');

/**
 * Link a patient to their Oura account
 */
async function linkPatient(req, res) {
  try {
    const { patientId, apiKey, ouraUserId } = req.body;

    if (!patientId || !apiKey) {
      return res.status(400).json({
        error: { message: 'patientId and apiKey required' }
      });
    }

    // Store the API key and user ID
    const patientData = JSON.stringify({
      apiKey,
      ouraUserId: ouraUserId || null,
      linkedAt: new Date().toISOString()
    });

    await keyStore.set(`oura:patient:${patientId}`, patientData);

    req.log.info({ patientId }, 'Patient linked to Oura account');

    res.json({
      success: true,
      message: 'Patient linked to Oura account successfully',
      patientId
    });
  } catch (error) {
    req.log.error({ error }, 'Error linking patient');
    res.status(500).json({
      error: { message: 'Failed to link patient to Oura account' }
    });
  }
}

/**
 * Get patient's Oura data
 */
async function getPatientData(req, res) {
  try {
    const { patientId } = req.params;
    const { startDate, endDate } = req.query;

    // Get patient's API key
    const patientDataStr = await keyStore.get(`oura:patient:${patientId}`);
    
    if (!patientDataStr) {
      return res.status(404).json({
        error: { message: 'Patient not linked to Oura account' }
      });
    }

    const patientData = JSON.parse(patientDataStr);
    const ouraApi = new OuraAPI(patientData.apiKey);

    // Calculate date range (default to last 7 days)
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch data from Oura API
    const [activity, sleep, readiness] = await Promise.all([
      ouraApi.getDailyActivity(start, end).catch(() => ({ data: [] })),
      ouraApi.getDailySleep(start, end).catch(() => ({ data: [] })),
      ouraApi.getDailyReadiness(start, end).catch(() => ({ data: [] }))
    ]);

    // Get the most recent data
    const latestActivity = activity.data[activity.data.length - 1] || {};
    const latestSleep = sleep.data[sleep.data.length - 1] || {};
    const latestReadiness = readiness.data[readiness.data.length - 1] || {};

    res.json({
      patientId,
      hasLinkedOura: true,
      data: {
        activity: {
          steps: latestActivity.steps || 0,
          activeCalories: latestActivity.active_calories || 0,
          totalCalories: latestActivity.total_calories || 0,
          score: latestActivity.score || null,
          date: latestActivity.day || null
        },
        sleep: {
          totalSleep: latestSleep.total_sleep_duration || 0,
          deepSleep: latestSleep.deep_sleep_duration || 0,
          remSleep: latestSleep.rem_sleep_duration || 0,
          score: latestSleep.score || null,
          efficiency: latestSleep.efficiency || null,
          date: latestSleep.day || null
        },
        readiness: {
          score: latestReadiness.score || null,
          temperatureDeviation: latestReadiness.temperature_deviation || null,
          date: latestReadiness.day || null
        }
      }
    });
  } catch (error) {
    req.log.error({ error, patientId: req.params.patientId }, 'Error fetching patient data');
    res.status(500).json({
      error: { message: 'Failed to fetch Oura data' }
    });
  }
}

/**
 * Get patient's 7-day summary
 */
async function getPatientSummary(req, res) {
  try {
    const { patientId } = req.params;

    // Get patient's API key
    const patientDataStr = await keyStore.get(`oura:patient:${patientId}`);
    
    if (!patientDataStr) {
      return res.status(404).json({
        error: { message: 'Patient not linked to Oura account' }
      });
    }

    const patientData = JSON.parse(patientDataStr);
    const ouraApi = new OuraAPI(patientData.apiKey);

    // Get last 7 days
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch data
    const [activity, sleep, readiness] = await Promise.all([
      ouraApi.getDailyActivity(start, end),
      ouraApi.getDailySleep(start, end),
      ouraApi.getDailyReadiness(start, end)
    ]);

    // Calculate averages
    const avgSteps = activity.data.reduce((sum, d) => sum + (d.steps || 0), 0) / activity.data.length;
    const avgSleepScore = sleep.data.reduce((sum, d) => sum + (d.score || 0), 0) / sleep.data.length;
    const avgReadinessScore = readiness.data.reduce((sum, d) => sum + (d.score || 0), 0) / readiness.data.length;

    res.json({
      patientId,
      period: '7 days',
      summary: {
        averageSteps: Math.round(avgSteps),
        averageSleepScore: Math.round(avgReadinessScore),
        averageReadinessScore: Math.round(avgReadinessScore),
        totalDays: activity.data.length
      },
      dailyData: {
        activity: activity.data,
        sleep: sleep.data,
        readiness: readiness.data
      }
    });
  } catch (error) {
    req.log.error({ error, patientId: req.params.patientId }, 'Error fetching patient summary');
    res.status(500).json({
      error: { message: 'Failed to fetch Oura summary' }
    });
  }
}

/**
 * Unlink patient from Oura account
 */
async function unlinkPatient(req, res) {
  try {
    const { patientId } = req.params;

    await keyStore.del(`oura:patient:${patientId}`);

    req.log.info({ patientId }, 'Patient unlinked from Oura account');

    res.json({
      success: true,
      message: 'Patient unlinked from Oura account successfully'
    });
  } catch (error) {
    req.log.error({ error }, 'Error unlinking patient');
    res.status(500).json({
      error: { message: 'Failed to unlink patient' }
    });
  }
}

/**
 * Webhook verification endpoint
 */
function verifyWebhook(req, res) {
  const { verification_token, challenge } = req.query;

  if (verification_token === process.env.OURA_VERIFICATION_TOKEN) {
    res.json({ challenge });
  } else {
    res.status(401).send('Invalid verification token');
  }
}

/**
 * Webhook data handler
 */
function handleWebhook(req, res) {
  try {
    const signature = req.headers['x-oura-signature'];
    const timestamp = req.headers['x-oura-timestamp'];

    // Verify HMAC signature
    const hmac = crypto.createHmac('sha256', process.env.OURA_CLIENT_SECRET);
    hmac.update(timestamp + JSON.stringify(req.body));
    const calculatedSignature = hmac.digest('hex').toUpperCase();

    if (calculatedSignature !== signature) {
      return res.status(401).send('Invalid signature');
    }

    const { event_type, data_type, object_id, user_id } = req.body;

    req.log.info({ event_type, data_type, object_id, user_id }, 'Webhook received');

    // TODO: Process webhook data asynchronously
    // This would typically fetch the new data and update cache

    res.status(200).send('OK');
  } catch (error) {
    req.log.error({ error }, 'Error handling webhook');
    res.status(500).send('Internal Server Error');
  }
}

module.exports = {
  linkPatient,
  getPatientData,
  getPatientSummary,
  unlinkPatient,
  verifyWebhook,
  handleWebhook
};
