require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');

const lotteryRoutes  = require('./routes/lottery');
const analysisRoutes = require('./routes/analysis');
const store          = require('./data/store');
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

      // ดึงย้อนหลังใน background (ไม่ block request)
      fetchHistorical(24).then(records => {
        if (records.length > 0) {
          store.setRecords(records);
          console.log(`✅ ดึงข้อมูลย้อนหลัง ${records.length} งวด สำเร็จ`);
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
