/**
 * feed.js — Recommendation Feed API routes
 *
 * Exposes:
 *   GET /api/feed/recommendations
 */

const express = require('express');
const router = express.Router();
const { getRecommendationFeed } = require('../controllers/feedControllerPostgres');

router.get('/recommendations', getRecommendationFeed);

module.exports = router;
