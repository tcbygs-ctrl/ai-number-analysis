const express = require('express');
const router = express.Router();
const LotteryResult = require('../models/LotteryResult');
const store = require('../data/store');
const { fetchLatest, fetchHistorical } = require('../services/lotteryFetcher');

async function getFromDb(limit) {
  try {
    const results = await LotteryResult.find().sort({ drawDate: -1 }).limit(limit);
    return results.length > 0 ? results : null;
  } catch {
    return null;
  }
}

// GET /api/lottery
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const dbResults = await getFromDb(limit);
    const results = dbResults || store.getLatest(limit);
    res.json({ success: true, data: results, total: results.length, source: dbResults ? 'mongodb' : 'api-cache' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/lottery
router.post('/', async (req, res) => {
  try {
    const { drawDate, firstPrize, lastTwo, lastThree, frontThree, nearFirst } = req.body;
    const result = new LotteryResult({ drawDate, firstPrize, lastTwo, lastThree, frontThree, nearFirst });
    await result.save();
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/lottery/bulk
router.post('/bulk', async (req, res) => {
  try {
    const { records } = req.body;
    const results = await LotteryResult.insertMany(records);
    res.status(201).json({ success: true, inserted: results.length });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/lottery/fetch-latest — ดึงงวดล่าสุดจาก API จริง
router.post('/fetch-latest', async (req, res) => {
  try {
    store.setStatus('fetching');
    const record = await fetchLatest();
    store.upsertRecord(record);
    store.setStatus('done');

    try {
      await LotteryResult.findOneAndUpdate(
        { drawDate: record.drawDate },
        record,
        { upsert: true, new: true }
      );
    } catch { /* MongoDB ไม่ได้เชื่อมต่อ ไม่เป็นไร */ }

    res.json({ success: true, data: record, message: 'ดึงข้อมูลงวดล่าสุดสำเร็จ' });
  } catch (err) {
    store.setStatus('error', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/lottery/fetch-history?count=24 — ดึงข้อมูลย้อนหลัง
router.post('/fetch-history', async (req, res) => {
  const count = parseInt(req.query.count) || 24;
  res.json({ success: true, message: `กำลังดึงข้อมูลย้อนหลัง ${count} งวดในพื้นหลัง...` });

  // ทำงานใน background
  (async () => {
    try {
      store.setStatus('fetching');
      const records = await fetchHistorical(count);
      store.setRecords(records);
      store.setStatus('done');

      try {
        for (const r of records) {
          await LotteryResult.findOneAndUpdate(
            { drawDate: r.drawDate },
            r,
            { upsert: true, new: true }
          );
        }
      } catch { /* MongoDB ไม่ได้เชื่อมต่อ */ }

      console.log(`✅ ดึงข้อมูลย้อนหลัง ${records.length}/${count} งวด สำเร็จ`);
    } catch (err) {
      store.setStatus('error', err);
      console.error('❌ fetch-history error:', err.message);
    }
  })();
});

// GET /api/lottery/fetch-status — ตรวจสอบสถานะการดึงข้อมูล
router.get('/fetch-status', (req, res) => {
  res.json({ success: true, ...store.getStatus() });
});

module.exports = router;
