const https = require('https');
const http  = require('http');

const RAYRIFFY_BASE = 'https://lotto.api.rayriffy.com';
const SANOOK_BASE   = 'https://news.sanook.com/lotto/check';
const ARCHIVE_URL   = 'https://raw.githubusercontent.com/vicha-w/thai-lotto-archive/master/data.json';

// ---- HTTP helpers ----

function httpGet(url, redirects = 0) {
  if (redirects > 5) return Promise.reject(new Error('Too many redirects'));
  const mod = url.startsWith('https') ? https : http;
  return new Promise((resolve, reject) => {
    mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        const loc = res.headers.location;
        const next = loc.startsWith('http') ? loc : new URL(loc, url).href;
        return httpGet(next, redirects + 1).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function fetchJson(url) {
  const { body } = await httpGet(url);
  return JSON.parse(body);
}

// ---- Date helpers ----

function parseThaiDate(thaiDateStr) {
  const months = {
    'มกราคม': 0, 'กุมภาพันธ์': 1, 'มีนาคม': 2,    'เมษายน': 3,
    'พฤษภาคม': 4, 'มิถุนายน': 5,  'กรกฎาคม': 6,   'สิงหาคม': 7,
    'กันยายน': 8, 'ตุลาคม': 9,    'พฤศจิกายน': 10, 'ธันวาคม': 11
  };
  const parts = thaiDateStr.trim().split(' ');
  if (parts.length !== 3) return null;
  const day   = parseInt(parts[0]);
  const month = months[parts[1]];
  const year  = parseInt(parts[2]) - 543;
  if (isNaN(day) || month === undefined || isNaN(year)) return null;
  return new Date(year, month, day);
}

// สร้าง list วันที่ย้อนหลัง format DDMMYYYY (พ.ศ.)
function getPastDrawDates(count) {
  const dates = [];
  const now   = new Date();
  let year    = now.getFullYear();
  let month   = now.getMonth() + 1;
  let drawDay = now.getDate() >= 16 ? 16 : 1;

  for (let i = 0; i < count; i++) {
    const beYear = year + 543;
    dates.push(`${String(drawDay).padStart(2,'0')}${String(month).padStart(2,'0')}${beYear}`);
    if (drawDay === 16) { drawDay = 1; }
    else { drawDay = 16; month--; if (month < 1) { month = 12; year--; } }
  }
  return dates;
}

// ---- Parsers ----

// แปลง rayriffy API response → schema
function mapRayriftyResponse(apiData) {
  const r = apiData.response;
  const drawDate = parseThaiDate(r.date);
  if (!drawDate) throw new Error(`ไม่สามารถแปลงวันที่: ${r.date}`);

  const findPrize   = id => r.prizes.find(p => p.id === id);
  const findRunning = id => r.runningNumbers.find(p => p.id === id);

  return {
    drawDate,
    firstPrize: findPrize('prizeFirst')?.number[0]           || '',
    lastTwo:    findRunning('runningNumberBackTwo')?.number[0] || '',
    lastThree:  findRunning('runningNumberBackThree')?.number  || [],
    frontThree: findRunning('runningNumberFrontThree')?.number || [],
    nearFirst:  findPrize('prizeFirstNear')?.number            || []
  };
}

// parse Sanook HTML → schema
function parseSanookHtml(html, dateStr) {
  const idx = html.indexOf('"prize_last3":[');
  if (idx < 0) return null;

  const start = html.lastIndexOf('{', idx);
  let depth = 0, end = start;
  for (let i = start; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
  }

  let obj;
  try { obj = JSON.parse(html.slice(start, end)); }
  catch { return null; }

  // แปลง dateStr DDMMYYYY (พ.ศ.) → Date
  const dd = parseInt(dateStr.slice(0, 2));
  const mm = parseInt(dateStr.slice(2, 4)) - 1;
  const yy = parseInt(dateStr.slice(4)) - 543;
  const drawDate = new Date(yy, mm, dd);

  return {
    drawDate,
    firstPrize: obj.prize_1    || '',
    lastTwo:    obj.prize_last2 || '',
    lastThree:  obj.prize_last3  || [],
    frontThree: obj.prize_first3 || [],
    nearFirst:  obj.prize1_close || []
  };
}

// แปลง vicha-w archive entry → schema
// รูปแบบ: { date: "YYYY-MM-DD", prizes: { first: "...", last2: "...", last3f: [...], last3b: [...], near1: [...] } }
function mapArchiveEntry(entry) {
  const drawDate = new Date(entry.date);
  if (isNaN(drawDate.getTime())) throw new Error(`วันที่ไม่ถูกต้อง: ${entry.date}`);
  const p = entry.prizes || entry.result || {};
  return {
    drawDate,
    firstPrize: p.first  || p.first1  || '',
    lastTwo:    p.last2  || '',
    lastThree:  Array.isArray(p.last3b) ? p.last3b : (p.last3b ? [p.last3b] : []),
    frontThree: Array.isArray(p.last3f) ? p.last3f : (p.last3f ? [p.last3f] : []),
    nearFirst:  Array.isArray(p.near1)  ? p.near1  : (p.near1  ? [p.near1]  : [])
  };
}

// ดึง archive ทั้งหมดจาก GitHub (Static JSON — ไม่ติด 5xx)
async function fetchFromArchive() {
  const data = await fetchJson(ARCHIVE_URL);
  if (!Array.isArray(data)) throw new Error('Archive ไม่ใช่ Array');
  return data
    .map(entry => { try { return mapArchiveEntry(entry); } catch { return null; } })
    .filter(r => r && r.firstPrize);
}

// ---- Public API ----

async function fetchLatest() {
  // ลอง rayriffy ก่อน ถ้าล้มเหลวให้ดึงงวดล่าสุดจาก archive แทน
  try {
    const data = await fetchJson(`${RAYRIFFY_BASE}/latest`);
    if (data.status !== 'success') throw new Error('API ตอบกลับ status ไม่ใช่ success');
    return mapRayriftyResponse(data);
  } catch (primaryErr) {
    console.warn(`⚠️  rayriffy ล้มเหลว (${primaryErr.message}) — ใช้ archive แทน`);
    const all = await fetchFromArchive();
    if (all.length === 0) throw new Error('Archive ว่างเปล่า');
    return all[0]; // เรียงใหม่→เก่า งวดแรกคืองวดล่าสุด
  }
}

async function fetchByDate(dateStr) {
  try {
    const { body, status } = await httpGet(`${SANOOK_BASE}/${dateStr}`);
    if (status !== 200) return null;
    return parseSanookHtml(body, dateStr);
  } catch {
    return null;
  }
}

async function fetchHistorical(count = 24) {
  const dates   = getPastDrawDates(count);
  const results = [];

  for (const dateStr of dates) {
    const record = await fetchByDate(dateStr);
    if (record && record.firstPrize) results.push(record);
    await new Promise(r => setTimeout(r, 200));
  }
  return results;
}

module.exports = { fetchLatest, fetchByDate, fetchHistorical, fetchFromArchive, getPastDrawDates };
