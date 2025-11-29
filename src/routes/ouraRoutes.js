const express = require('express');
const router = express.Router();
const ouraController = require('../controllers/ouraController');

// Webhook endpoints (called by Oura)
router.get('/webhook', ouraController.verifyWebhook);
router.post('/webhook', ouraController.handleWebhook);

// Patient management endpoints
router.post('/link', ouraController.linkPatient);
router.get('/patient/:patientId', ouraController.getPatientData);
router.get('/patient/:patientId/summary', ouraController.getPatientSummary);
router.delete('/patient/:patientId', ouraController.unlinkPatient);

// Batch operations
router.post('/patients/batch/summary', ouraController.getBatchPatientSummary);

module.exports = router;
