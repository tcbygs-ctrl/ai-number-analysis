const ss = require('simple-statistics');

/**
 * นับความถี่ของตัวเลขแต่ละตัวจาก dataset
 */
function buildFrequencyMap(numbers) {
  const freq = {};
  for (const num of numbers) {
    freq[num] = (freq[num] || 0) + 1;
  }
  return freq;
}

/**
 * คำนวณ Cooling Score — เลขที่ "เว้นช่วงนาน" จะได้คะแนนสูงกว่า (Inverted Recency)
 * เลขที่เพิ่งออกงวดล่าสุด → score ≈ 0 (cooling period)
 * เลขที่ไม่ออกมานานหรือยังไม่เคยออก → score → 1
 * ใช้ exponential: score = 1 − e^(−λ * distanceFromLatest)
 */
function buildRecencyMap(numbers, decay = 0.05) {
  const lastSeenPos = {};
  for (let i = 0; i < numbers.length; i++) {
    lastSeenPos[numbers[i]] = i; // numbers เรียง oldest→newest, ดัชนีสูง = ออกล่าสุด
  }
  const recency = {};
  for (let n = 0; n <= 99; n++) {
    const key = String(n).padStart(2, '0');
    const lastIdx = lastSeenPos[key];
    const distanceFromLatest = lastIdx === undefined
      ? numbers.length          // ไม่เคยออกเลย = ห่างสุด
      : (numbers.length - 1 - lastIdx); // 0=งวดล่าสุด, สูง=ไม่ออกมานาน
    recency[key] = 1 - Math.exp(-decay * distanceFromLatest);
  }
  return recency;
}

/**
 * คำนวณ "Gap Score" — เลขที่ขาดช่วงนานจะได้คะแนนพิเศษ (Due theory)
 */
function buildGapMap(numbers) {
  const lastSeen = {};
  const gap = {};
  const totalDraws = numbers.length;

  for (let i = 0; i < numbers.length; i++) {
    const num = numbers[i];
    if (lastSeen[num] !== undefined) {
      gap[num] = i - lastSeen[num];
    }
    lastSeen[num] = i;
  }

  // เลขที่ไม่เคยออกเลย หรือขาดนาน = gap สูง
  for (let n = 0; n <= 99; n++) {
    const key = String(n).padStart(2, '0');
    if (lastSeen[key] === undefined) {
      gap[key] = totalDraws;
    } else if (!gap[key]) {
      gap[key] = totalDraws - lastSeen[key];
    }
  }
  return gap;
}

/**
 * รวมคะแนนและคำนวณ % ความน่าจะเป็น
 * weights: { frequency, recency, gap }
 */
function calculateScores(numbers, weights = { frequency: 0.5, recency: 0.3, gap: 0.2 }) {
  const freqMap = buildFrequencyMap(numbers);
  const recencyMap = buildRecencyMap(numbers);
  const gapMap = buildGapMap(numbers);

  const maxFreq = Math.max(...Object.values(freqMap));
  const maxRecency = Math.max(...Object.values(recencyMap));
  const maxGap = Math.max(...Object.values(gapMap));

  const scores = {};
  const components = {};
  const allPairs = Array.from({ length: 100 }, (_, i) => String(i).padStart(2, '0'));

  for (const pair of allPairs) {
    const freqC    = ((freqMap[pair]    || 0) / (maxFreq    || 1)) * weights.frequency;
    const recencyC = ((recencyMap[pair] || 0) / (maxRecency || 1)) * weights.recency;
    const gapC     = ((gapMap[pair]     || 0) / (maxGap     || 1)) * weights.gap;
    scores[pair]     = freqC + recencyC + gapC;
    components[pair] = { freqC, recencyC, gapC };
  }

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const total = totalScore || 1;

  const result = Object.entries(scores).map(([pair, score]) => {
    const c = components[pair];
    return {
      pair,
      score,
      probability: totalScore > 0 ? parseFloat(((score / total) * 100).toFixed(2)) : 0,
      frequency: freqMap[pair] || 0,
      lastGap: gapMap[pair] || 0,
      components: {
        frequency: parseFloat(((c.freqC    / total) * 100).toFixed(1)),
        recency:   parseFloat(((c.recencyC / total) * 100).toFixed(1)),
        gap:       parseFloat(((c.gapC     / total) * 100).toFixed(1))
      }
    };
  });

  return result.sort((a, b) => b.score - a.score);
}

/**
 * ดึง Top N คู่ที่มีโอกาสสูงสุด
 */
function getTopPredictions(numbers, topN = 8, weights) {
  const ranked = calculateScores(numbers, weights);
  return ranked.slice(0, topN);
}

/**
 * สถิติพื้นฐานของชุดตัวเลข
 */
function getBasicStats(numbers) {
  const numArr = numbers.map(n => parseInt(n, 10));
  return {
    count: numArr.length,
    mean: parseFloat(ss.mean(numArr).toFixed(2)),
    median: ss.median(numArr),
    mode: ss.mode(numArr),
    stdDev: parseFloat(ss.standardDeviation(numArr).toFixed(2)),
    min: ss.min(numArr),
    max: ss.max(numArr)
  };
}

/**
 * วิเคราะห์ความถี่ทุกตัวเลข (00-99) พร้อม % ต่อรวม
 */
function getFullFrequencyAnalysis(numbers) {
  const freqMap = buildFrequencyMap(numbers);
  const total = numbers.length;

  return Array.from({ length: 100 }, (_, i) => {
    const pair = String(i).padStart(2, '0');
    const count = freqMap[pair] || 0;
    return {
      pair,
      count,
      percentage: total > 0 ? parseFloat(((count / total) * 100).toFixed(2)) : 0
    };
  });
}

module.exports = {
  getTopPredictions,
  getBasicStats,
  getFullFrequencyAnalysis,
  calculateScores,
  buildFrequencyMap
};
