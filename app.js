require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');

const lotteryRoutes  = require('./routes/lottery');
const analysisRoutes = require('./routes/analysis');
const store          = require('./data/store');

function dateFilter(date) {
  const d = new Date(date);
  return { drawDate: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())) };
}
const { fetchLatest, fetchHistorical } = require('./services/lotteryFetcher');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// เชื่อม MongoDB (ถ้ามี)
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.log('⚠️  MongoDB not connected:', err.message));
}

app.use('/api/lottery',  lotteryRoutes);
app.use('/api/analysis', analysisRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ดึงข้อมูลจาก API จริง (ใช้ทั้ง local และ Vercel cold start)
let _initDone = false;
let _initPromise = null;

async function initData() {
  if (_initDone) return;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      store.setStatus('fetching');
      const latest = await fetchLatest();
      store.upsertRecord(latest);
      console.log(`✅ ดึงงวดล่าสุด (${latest.drawDate.toLocaleDateString('th-TH')}) สำเร็จ`);
      _initDone = true;

      // โหลดจาก MongoDB ก่อน (ถ้ามีข้อมูล)
      try {
        const LotteryResult = require('./models/LotteryResult');
        const dbRecords = await LotteryResult.find().sort({ drawDate: -1 }).limit(120);
        if (dbRecords.length > 0) {
          store.mergeRecords(dbRecords);
          console.log(`✅ โหลดจาก MongoDB ${dbRecords.length} งวด`);
        }
        if (dbRecords.length >= 20) {
          store.setStatus('done');
          return; // มีข้อมูลเพียงพอแล้ว ไม่ต้องดึงจาก API
        }
      } catch { /* MongoDB ไม่ได้เชื่อมต่อ */ }

      // ถ้า MongoDB ว่าง ดึงจาก API ย้อนหลัง
      fetchHistorical(24).then(async records => {
        if (records.length > 0) {
          store.mergeRecords(records);
          console.log(`✅ ดึงข้อมูลย้อนหลัง ${records.length} งวด สำเร็จ`);
          // save ลง MongoDB
          try {
            const LotteryResult = require('./models/LotteryResult');
            for (const r of records) {
              await LotteryResult.findOneAndUpdate(
                dateFilter(r.drawDate), r, { upsert: true, new: true }
              );
            }
            console.log(`✅ บันทึกลง MongoDB ${records.length} รายการ`);
          } catch { /* MongoDB ไม่ได้เชื่อมต่อ */ }
        }
        store.setStatus('done');
      }).catch(err => {
        store.setStatus('error', err);
        console.error('❌ fetch-history error:', err.message);
      });

    } catch (err) {
      store.setStatus('error', err);
      console.error('❌ initData error:', err.message);
      _initDone = true;
    } finally {
      _initPromise = null;
    }
  })();

  return _initPromise;
}

module.exports = { app, initData };
