const express = require('express');
const router = express.Router();
const LotteryResult = require('../models/LotteryResult');
const store = require('../data/store');
const {
  getTopPredictions,
  getBasicStats,
  getFullFrequencyAnalysis
} = require('../utils/statistics');

async function getRecords(limit = 100) {
  try {
    const results = await LotteryResult.find().sort({ drawDate: -1 }).limit(limit);
    if (results.length > 0) return results;
  } catch {}
  return store.getLatest(limit);
}

async function getLastTwoNumbers(limit = 100) {
  const records = await getRecords(limit);
  return records.map(r => r.lastTwo);
}

// GET /api/analysis/predict
router.get('/predict', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 60;
    const topN  = parseInt(req.query.topN)  || 8;
    const fw    = parseFloat(req.query.fw)   || 0.5;
    const rw    = parseFloat(req.query.rw)   || 0.3;
    const gw    = parseFloat(req.query.gw)   || 0.2;

    const numbers     = await getLastTwoNumbers(limit);
    const predictions = getTopPredictions(numbers, topN);

    res.json({ success: true, drawsAnalyzed: numbers.length, weights: { frequency: fw, recency: rw, gap: gw }, predictions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/analysis/frequency
router.get('/frequency', async (req, res) => {
  try {
    const limit     = parseInt(req.query.limit) || 60;
    const numbers   = await getLastTwoNumbers(limit);
    const frequency = getFullFrequencyAnalysis(numbers);
    const stats     = getBasicStats(numbers);
    res.json({ success: true, drawsAnalyzed: numbers.length, stats, frequency });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/analysis/stats
router.get('/stats', async (req, res) => {
  try {
    const limit   = parseInt(req.query.limit) || 100;
    const numbers = await getLastTwoNumbers(limit);
    const stats   = getBasicStats(numbers);
    res.json({ success: true, drawsAnalyzed: numbers.length, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/analysis/hot-cold
router.get('/hot-cold', async (req, res) => {
  try {
    const limit     = parseInt(req.query.limit) || 60;
    const numbers   = await getLastTwoNumbers(limit);
    const frequency = getFullFrequencyAnalysis(numbers);

    const sorted = [...frequency].sort((a, b) => b.count - a.count);
    const hot    = sorted.slice(0, 10);
    const cold   = sorted.slice(-10).reverse();

    res.json({ success: true, drawsAnalyzed: numbers.length, hot, cold });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/analysis/draw-context
router.get('/draw-context', async (req, res) => {
  try {
    const now   = new Date();
    const year  = now.getFullYear();
    const month = now.getMonth();
    const day   = now.getDate();

    let nextDraw;
    if (day < 1) {
      nextDraw = new Date(year, month, 1);
    } else if (day < 16) {
      nextDraw = new Date(year, month, 16);
    } else {
      nextDraw = new Date(year, month + 1, 1);
    }

    const msPerDay  = 1000 * 60 * 60 * 24;
    const daysLeft  = Math.ceil((nextDraw - now) / msPerDay);
    const records   = await getRecords(2);
    const latestResult = records[0] || null;
    const prevResult   = records[1] || null;

    res.json({
      success: true,
      nextDraw: {
        date: nextDraw,
        dateStr: nextDraw.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }),
        daysLeft
      },
      latestResult,
      prevResult,
      dataSource: store.getStatus()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
