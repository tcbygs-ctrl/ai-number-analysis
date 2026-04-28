const express = require('express');
const router = express.Router();
const LotteryResult = require('../models/LotteryResult');
const store = require('../data/store');
const { fetchLatest, fetchHistorical, fetchFromArchive } = require('../services/lotteryFetcher');

// filter วันที่แบบ range เพื่อป้องกัน timezone/millisecond mismatch
function dateFilter(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return { drawDate: { $gte: d, $lt: new Date(d.getTime() + 86400000) } };
}

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
        dateFilter(record.drawDate),
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

  // ไม่รันซ้ำถ้ากำลัง fetching อยู่
  if (store.getStatus().status === 'fetching') {
    return res.json({ success: true, message: 'กำลังดึงข้อมูลอยู่แล้ว กรุณารอ...' });
  }

  res.json({ success: true, message: `กำลังดึงข้อมูลย้อนหลัง ${count} งวดในพื้นหลัง...` });

  (async () => {
    try {
      store.setStatus('fetching');
      const records = await fetchHistorical(count);

      // merge แทน replace — ข้อมูลเดิมไม่หาย
      store.mergeRecords(records);
      store.setStatus('done');

      // save ลง MongoDB (ถ้าเชื่อมต่ออยู่)
      let saved = 0;
      for (const r of records) {
        try {
          await LotteryResult.findOneAndUpdate(
            { drawDate: r.drawDate }, r, { upsert: true, new: true }
          );
          saved++;
        } catch { /* record นี้ save ไม่ได้ ข้ามไป */ }
      }

      console.log(`✅ ดึงย้อนหลัง ${records.length}/${count} งวด | บันทึก MongoDB ${saved} รายการ | รวมใน store ${store.getStatus().count} งวด`);
    } catch (err) {
      store.setStatus('error', err);
      console.error('❌ fetch-history error:', err.message);
    }
  })();
});

// POST /api/lottery/seed-archive — ดึงข้อมูลทั้งหมดจาก GitHub archive แล้ว seed ลง MongoDB
router.post('/seed-archive', async (req, res) => {
  if (store.getStatus().status === 'fetching') {
    return res.json({ success: true, message: 'กำลังดึงข้อมูลอยู่แล้ว กรุณารอ...' });
  }

  res.json({ success: true, message: 'กำลัง seed ข้อมูลจาก GitHub archive ในพื้นหลัง...' });

  (async () => {
    try {
      store.setStatus('fetching');
      const records = await fetchFromArchive();
      store.mergeRecords(records);
      store.setStatus('done');

      let saved = 0;
      for (const r of records) {
        try {
          await LotteryResult.findOneAndUpdate(
            { drawDate: r.drawDate }, r, { upsert: true, new: true }
          );
          saved++;
        } catch { /* MongoDB ไม่ได้เชื่อมต่อ หรือ record นี้ save ไม่ได้ */ }
      }

      console.log(`✅ seed-archive: ดึง ${records.length} งวด | บันทึก MongoDB ${saved} รายการ`);
    } catch (err) {
      store.setStatus('error', err);
      console.error('❌ seed-archive error:', err.message);
    }
  })();
});

// GET /api/lottery/fetch-status — ตรวจสอบสถานะการดึงข้อมูล
router.get('/fetch-status', (req, res) => {
  res.json({ success: true, ...store.getStatus() });
});

module.exports = router;
