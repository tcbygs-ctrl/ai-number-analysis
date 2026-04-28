const { GoogleGenerativeAI } = require('@google/generative-ai');
const { calculateScores, buildFrequencyMap } = require('./statistics');

/**
 * คำนวณ features เพิ่มเติมจากข้อมูลประวัติ
 */
function extractFeatures(numbers, drawDates = []) {
  const freqMap = buildFrequencyMap(numbers);
  const total = numbers.length;

  // นับ parity (เลขคู่/คี่)
  let evenCount = 0, oddCount = 0;
  for (const n of numbers) {
    if (parseInt(n, 10) % 2 === 0) evenCount++;
    else oddCount++;
  }

  // หา consecutive pairs (เลขที่ออกติดกัน 2 งวดขึ้นไป)
  const consecutivePairs = {};
  for (let i = 1; i < numbers.length; i++) {
    const key = `${numbers[i - 1]}->${numbers[i]}`;
    consecutivePairs[key] = (consecutivePairs[key] || 0) + 1;
  }
  const topConsecutive = Object.entries(consecutivePairs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pair, count]) => ({ pair, count }));

  // Top 10 ความถี่สูงสุด
  const topFreq = Object.entries(freqMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([pair, count]) => ({ pair, count, pct: ((count / total) * 100).toFixed(1) }));

  // Bottom 10 ความถี่ต่ำสุด (cold numbers)
  const bottomFreq = Object.entries(freqMap)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 10)
    .map(([pair, count]) => ({ pair, count, pct: ((count / total) * 100).toFixed(1) }));

  // เลข 5 งวดล่าสุด
  const recent5 = numbers.slice(-5);

  // การวิเคราะห์ตามช่วงของตัวเลข (00-09, 10-19, ...)
  const decadeFreq = {};
  for (let d = 0; d <= 9; d++) {
    const decade = `${d}0-${d}9`;
    decadeFreq[decade] = 0;
  }
  for (const n of numbers) {
    const decade = `${Math.floor(parseInt(n, 10) / 10)}0-${Math.floor(parseInt(n, 10) / 10)}9`;
    decadeFreq[decade] = (decadeFreq[decade] || 0) + 1;
  }

  // วิเคราะห์ตามเดือน (ถ้ามี drawDates)
  const monthlyPattern = {};
  if (drawDates.length === numbers.length) {
    for (let i = 0; i < numbers.length; i++) {
      const month = new Date(drawDates[i]).getMonth() + 1;
      if (!monthlyPattern[month]) monthlyPattern[month] = {};
      monthlyPattern[month][numbers[i]] = (monthlyPattern[month][numbers[i]] || 0) + 1;
    }
  }

  return {
    total,
    recent5,
    evenOddRatio: { even: evenCount, odd: oddCount, evenPct: ((evenCount / total) * 100).toFixed(1) },
    topFreq,
    bottomFreq,
    topConsecutive,
    decadeFreq,
    monthlyPattern
  };
}

/**
 * เรียก Claude AI เพื่อวิเคราะห์และทำนายตัวเลข
 */
async function getAIPredictions(numbers, drawDates = [], nextDrawDate = null) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY ยังไม่ได้ตั้งค่าใน .env');
  }

  const features = extractFeatures(numbers, drawDates);
  const statScores = calculateScores(numbers).slice(0, 20);

  const nextDrawStr = nextDrawDate
    ? new Date(nextDrawDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'งวดถัดไป';

  const prompt = `คุณเป็น AI ผู้เชี่ยวชาญการวิเคราะห์ตัวเลขสถิติหวยรัฐบาลไทย (เลข 2 ตัวท้าย 00-99)

ข้อมูลสถิติย้อนหลัง ${features.total} งวด:

**เลข 5 งวดล่าสุด (เรียงจากเก่าไปใหม่):** ${features.recent5.join(', ')}

**Top 10 ออกบ่อยสุด:**
${features.topFreq.map(f => `  ${f.pair}: ${f.count} ครั้ง (${f.pct}%)`).join('\n')}

**Top 10 ออกน้อยสุด (Cold Numbers):**
${features.bottomFreq.map(f => `  ${f.pair}: ${f.count} ครั้ง (${f.pct}%)`).join('\n')}

**Transition ที่เกิดบ่อย (งวดก่อน→งวดนี้):**
${features.topConsecutive.map(c => `  ${c.pair}: ${c.count} ครั้ง`).join('\n')}

**การกระจายตามช่วง (Decade Analysis):**
${Object.entries(features.decadeFreq).map(([d, c]) => `  ${d}: ${c} ครั้ง`).join('\n')}

**สัดส่วนเลขคู่/คี่:** คู่ ${features.evenOddRatio.evenPct}% / คี่ ${(100 - parseFloat(features.evenOddRatio.evenPct)).toFixed(1)}%

**Top 20 คู่จาก Statistical Score (FW+RW+GW):**
${statScores.map((s, i) => `  ${i + 1}. ${s.pair} (${s.probability}%) - ออก ${s.frequency} ครั้ง, Gap ${s.lastGap}`).join('\n')}

โปรดวิเคราะห์สำหรับ**${nextDrawStr}**โดย:
1. มองหา non-linear patterns เช่น cycle, seasonal, transition probability
2. พิจารณา decade ที่ under/over-represented
3. พิจารณา parity และ consecutive patterns
4. รวมกับ statistical score เพื่อสร้าง ensemble prediction

ตอบเป็น JSON เท่านั้น รูปแบบ:
{
  "predictions": [
    {"pair": "XX", "aiScore": 0.0-1.0, "reason": "เหตุผลสั้นๆ ภาษาไทย"}
  ],
  "insights": ["insight 1", "insight 2", "insight 3"],
  "warning": "คำเตือนสั้นๆ"
}

กำหนด predictions 8 คู่ เรียงจากมั่นใจมากไปน้อย แต่ละคู่มี reason ไม่เกิน 30 คำ`;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();
  // แกะ JSON จาก response (อาจมี markdown code block)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI ตอบกลับในรูปแบบที่ไม่ถูกต้อง');

  const parsed = JSON.parse(jsonMatch[0]);

  // merge กับ stat scores
  const statMap = {};
  for (const s of statScores) statMap[s.pair] = s;

  const merged = parsed.predictions.map(p => ({
    pair: p.pair,
    aiScore: p.aiScore,
    reason: p.reason,
    frequency: statMap[p.pair]?.frequency || 0,
    lastGap: statMap[p.pair]?.lastGap || 0,
    statProbability: statMap[p.pair]?.probability || 0
  }));

  return {
    predictions: merged,
    insights: parsed.insights || [],
    warning: parsed.warning || '',
    features: {
      recent5: features.recent5,
      evenOddRatio: features.evenOddRatio,
      topConsecutive: features.topConsecutive,
      decadeFreq: features.decadeFreq
    }
  };
}

module.exports = { getAIPredictions };
