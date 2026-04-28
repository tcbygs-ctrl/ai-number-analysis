// In-memory store ใช้เมื่อ MongoDB ไม่ได้เชื่อมต่อ
// เรียงจากใหม่ → เก่า (drawDate descending)

let _records = [];
let _lastFetchedAt = null;
let _fetchStatus = 'idle'; // idle | fetching | done | error
let _fetchError = null;

function getAll() {
  return _records;
}

function getLatest(limit = 30) {
  return _records.slice(0, limit);
}

// แทนที่ทั้งหมด (ใช้เฉพาะตอนโหลดครั้งแรก)
function setRecords(records) {
  if (!records || records.length === 0) return; // ไม่แทนที่ถ้าไม่มีข้อมูล
  _records = [...records].sort((a, b) => new Date(b.drawDate) - new Date(a.drawDate));
  _lastFetchedAt = new Date();
}

// merge records โดยไม่ลบข้อมูลที่มีอยู่
function mergeRecords(records) {
  if (!records || records.length === 0) return;
  for (const r of records) upsertRecord(r);
}

function upsertRecord(record) {
  const dateStr = new Date(record.drawDate).toDateString();
  const idx = _records.findIndex(r => new Date(r.drawDate).toDateString() === dateStr);
  if (idx >= 0) {
    _records[idx] = record;
  } else {
    _records.push(record);
    _records.sort((a, b) => new Date(b.drawDate) - new Date(a.drawDate));
  }
  _lastFetchedAt = new Date();
}

function setStatus(status, error = null) {
  _fetchStatus = status;
  _fetchError = error ? error.message || String(error) : null;
}

function getStatus() {
  return {
    status: _fetchStatus,
    error: _fetchError,
    lastFetchedAt: _lastFetchedAt,
    count: _records.length
  };
}

module.exports = { getAll, getLatest, setRecords, mergeRecords, upsertRecord, setStatus, getStatus };
