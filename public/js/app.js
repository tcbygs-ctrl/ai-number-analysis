const API = '';
let chartPred = null;
let chartFreq = null;

// ===== Tab Navigation =====
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// ===== Utilities =====
function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function showMsg(id, text, type = 'success') {
  const el = document.getElementById(id);
  const icon = type === 'success'
    ? '<i class="fa-solid fa-circle-check"></i>'
    : '<i class="fa-solid fa-circle-exclamation"></i>';
  el.innerHTML = icon + ' ' + text;
  el.className = 'msg-box ' + type;
}

function setLoading(id, msg = 'กำลังโหลด...') {
  document.getElementById(id).innerHTML =
    `<div class="loading-wrap"><span class="spinner"></span>${msg}</div>`;
}

async function apiFetch(path) {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function rankIcon(i) {
  if (i === 0) return '<i class="fa-solid fa-trophy" style="color:var(--yellow)"></i>';
  if (i === 1) return '<i class="fa-solid fa-medal" style="color:#cbd5e1"></i>';
  if (i === 2) return '<i class="fa-solid fa-award" style="color:var(--orange)"></i>';
  return `<span style="font-size:.65rem;font-weight:800;color:var(--text-muted)">#${i + 1}</span>`;
}

// ===== DRAW CONTEXT HERO =====
async function loadDrawContext() {
  const hero = document.getElementById('draw-context-hero');
  try {
    const d = await apiFetch('/api/analysis/draw-context');
    const nx = d.nextDraw;
    const lr = d.latestResult;
    const pr = d.prevResult;

    const daysLabel = nx.daysLeft === 0
      ? '<span class="draw-next-badge draw-next-badge--today"><i class="fa-solid fa-bolt"></i> วันนี้</span>'
      : `<span class="draw-next-badge"><i class="fa-solid fa-hourglass-half"></i> อีก ${nx.daysLeft} วัน</span>`;

    const prevStrip = pr ? `
      <div class="draw-prev-strip">
        <div class="draw-prev-label">
          <i class="fa-solid fa-clock-rotate-left"></i> งวดก่อนหน้า (${fmt(pr.drawDate)})
        </div>
        <div class="draw-prev-nums">
          <span class="draw-prev-first">${pr.firstPrize}</span>
          <span class="draw-prev-dot">·</span>
          <span class="draw-prev-last2">${pr.lastTwo}</span>
        </div>
      </div>` : '';

    const latestBlock = lr ? `
      <div class="draw-latest">
        <div class="draw-latest-header">
          <div class="draw-latest-eyebrow">
            <i class="fa-solid fa-circle-check"></i> ผลงวดล่าสุด
          </div>
          <div class="draw-latest-date">${fmt(lr.drawDate)}</div>
        </div>
        <div class="result-row">
          <div class="result-prize">
            <div class="result-prize-label"><i class="fa-solid fa-trophy"></i> รางวัลที่ 1</div>
            <div class="result-prize-num">${lr.firstPrize}</div>
          </div>
          <div class="result-prize last2">
            <div class="result-prize-label"><i class="fa-solid fa-hashtag"></i> 2 ตัวท้าย</div>
            <div class="result-prize-num">${lr.lastTwo}</div>
          </div>
        </div>
        <div class="result-tags">
          <div class="result-tag-group">
            <div class="result-tag-group-label"><i class="fa-solid fa-3"></i> 3 ตัวท้าย</div>
            <div class="result-tag-chips">
              ${(lr.lastThree || []).map(n => `<span>${n}</span>`).join('') || '<span style="color:var(--text-muted)">—</span>'}
            </div>
          </div>
          <div class="result-tag-group">
            <div class="result-tag-group-label"><i class="fa-solid fa-arrow-up-1-9"></i> 3 ตัวหน้า</div>
            <div class="result-tag-chips">
              ${(lr.frontThree || []).map(n => `<span>${n}</span>`).join('') || '<span style="color:var(--text-muted)">—</span>'}
            </div>
          </div>
        </div>
        ${prevStrip}
      </div>` : `
      <div class="draw-latest">
        <div class="empty-state" style="padding:24px">
          <i class="fa-solid fa-rotate"></i> กำลังโหลดข้อมูลจาก API... กรุณารอสักครู่แล้วกดรีเฟรช
        </div>
      </div>`;

    hero.innerHTML = `
      <div class="draw-next">
        <div class="draw-next-eyebrow">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          ทำนายสำหรับงวด
          ${daysLabel}
        </div>
        <div class="draw-next-title">${nx.dateStr}</div>
        <div class="draw-next-sub">
          <i class="fa-regular fa-calendar-days draw-sub-icon"></i>
          หวยรัฐบาลไทย ออกรางวัลทุกวันที่ 1 และ 16 ของเดือน
        </div>
        <div class="draw-countdown">
          <span class="countdown-num">${nx.daysLeft}</span>
          <span class="countdown-unit">วัน</span>
        </div>
        <div class="draw-next-note">
          <i class="fa-solid fa-circle-info"></i>
          ผลการทำนายด้านล่างคำนวณจากข้อมูลย้อนหลัง ด้วย Frequency · Recency · Gap Analysis
        </div>
      </div>
      ${latestBlock}`;
  } catch (err) {
    hero.innerHTML =
      `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i>${err.message}</div>`;
  }
}

// ===== PREDICT TAB =====
async function loadPredictions() {
  const limit = document.getElementById('pred-limit').value;
  const fw    = document.getElementById('pred-fw').value;
  const rw    = document.getElementById('pred-rw').value;
  const gw    = document.getElementById('pred-gw').value;

  setLoading('pred-cards', 'กำลังวิเคราะห์ข้อมูล...');
  document.getElementById('pred-info').textContent = '';

  try {
    const data = await apiFetch(`/api/analysis/predict?limit=${limit}&topN=8&fw=${fw}&rw=${rw}&gw=${gw}`);

    document.getElementById('pred-info').innerHTML =
      `วิเคราะห์จาก <strong>${data.drawsAnalyzed}</strong> งวด &nbsp;·&nbsp; ` +
      `น้ำหนัก: ความถี่ <strong>${fw}</strong> · ล่าสุด <strong>${rw}</strong> · Gap <strong>${gw}</strong>`;

    const cards = document.getElementById('pred-cards');
    cards.innerHTML = data.predictions.map((p, i) => `
      <div class="pred-card">
        <div class="pred-rank-badge">${rankIcon(i)}</div>
        <div class="pred-num">${p.pair}</div>
        <div class="pred-pct">${p.probability}%</div>
        <div class="pred-divider"></div>
        <div class="pred-meta">
          <div class="pred-meta-item">
            <span class="pm-label"><i class="fa-solid fa-arrow-trend-up"></i> ครั้ง</span>
            <span class="pm-value">${p.frequency}</span>
          </div>
          <div class="pred-meta-item">
            <span class="pm-label"><i class="fa-solid fa-ruler-horizontal"></i> Gap</span>
            <span class="pm-value">${p.lastGap}</span>
          </div>
        </div>
      </div>`).join('');

    drawPredChart(data.predictions);
  } catch (err) {
    document.getElementById('pred-cards').innerHTML =
      `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i>${err.message}</div>`;
  }
}

function drawPredChart(predictions) {
  const ctx = document.getElementById('chart-pred').getContext('2d');
  if (chartPred) chartPred.destroy();

  const colors = [
    '#eab308','#94a3b8','#f97316',
    '#6366f1','#8b5cf6','#06b6d4','#22c55e','#f43f5e'
  ];

  chartPred = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: predictions.map(p => p.pair),
      datasets: [{
        label: '% ความน่าจะเป็น',
        data: predictions.map(p => p.probability),
        backgroundColor: colors.map(c => c + '33'),
        borderColor: colors,
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#94a3b8', font: { family: 'Sarabun', size: 12 } } },
        tooltip: {
          backgroundColor: '#1e293b',
          borderColor: '#334155',
          borderWidth: 1,
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          padding: 12,
          callbacks: {
            label: ctx =>
              ` ${ctx.raw}%  —  ออก ${predictions[ctx.dataIndex].frequency} ครั้ง, Gap ${predictions[ctx.dataIndex].lastGap} งวด`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8', font: { family: 'Sarabun', size: 13, weight: '700' } },
          grid: { color: 'rgba(255,255,255,0.04)' },
          border: { color: 'rgba(255,255,255,0.08)' }
        },
        y: {
          ticks: { color: '#94a3b8', callback: v => v + '%', font: { family: 'Sarabun', size: 11 } },
          grid: { color: 'rgba(255,255,255,0.06)' },
          border: { color: 'rgba(255,255,255,0.08)' }
        }
      }
    }
  });
}

// ===== FREQUENCY TAB =====
async function loadFrequency() {
  const limit = document.getElementById('freq-limit').value;
  document.getElementById('freq-stats').innerHTML =
    '<div class="loading-wrap"><span class="spinner"></span>กำลังโหลด...</div>';

  try {
    const data = await apiFetch(`/api/analysis/frequency?limit=${limit}`);
    const s = data.stats;

    document.getElementById('freq-stats').innerHTML = `
      <div class="stat-item">
        <span class="si-label"><i class="fa-solid fa-database"></i> งวด</span>
        <span class="si-value">${data.drawsAnalyzed}</span>
      </div>
      <div class="stat-item">
        <span class="si-label"><i class="fa-solid fa-calculator"></i> ค่าเฉลี่ย</span>
        <span class="si-value">${s.mean}</span>
      </div>
      <div class="stat-item">
        <span class="si-label"><i class="fa-solid fa-align-center"></i> มัธยฐาน</span>
        <span class="si-value">${s.median}</span>
      </div>
      <div class="stat-item">
        <span class="si-label"><i class="fa-solid fa-star"></i> ฐานนิยม</span>
        <span class="si-value">${s.mode}</span>
      </div>
      <div class="stat-item">
        <span class="si-label"><i class="fa-solid fa-chart-simple"></i> Std Dev</span>
        <span class="si-value">${s.stdDev}</span>
      </div>
      <div class="stat-item">
        <span class="si-label"><i class="fa-solid fa-arrow-down"></i> Min</span>
        <span class="si-value">${String(s.min).padStart(2,'0')}</span>
      </div>
      <div class="stat-item">
        <span class="si-label"><i class="fa-solid fa-arrow-up"></i> Max</span>
        <span class="si-value">${String(s.max).padStart(2,'0')}</span>
      </div>`;

    drawFreqChart(data.frequency);
  } catch (err) {
    document.getElementById('freq-stats').innerHTML =
      `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i>${err.message}</div>`;
  }
}

function drawFreqChart(freq) {
  const ctx = document.getElementById('chart-freq').getContext('2d');
  if (chartFreq) chartFreq.destroy();

  const maxCount = Math.max(...freq.map(f => f.count));
  chartFreq = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: freq.map(f => f.pair),
      datasets: [{
        label: 'จำนวนครั้ง',
        data: freq.map(f => f.count),
        backgroundColor: freq.map(f => {
          const ratio = f.count / (maxCount || 1);
          return `rgba(${Math.round(99 + ratio * 100)}, ${Math.round(102 - ratio * 30)}, 241, ${0.25 + ratio * 0.65})`;
        }),
        borderColor: freq.map(f => {
          const ratio = f.count / (maxCount || 1);
          return ratio > 0.7 ? '#eab308' : ratio > 0.4 ? '#818cf8' : '#334155';
        }),
        borderWidth: 1,
        borderRadius: 3,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#94a3b8', font: { family: 'Sarabun', size: 12 } } },
        tooltip: {
          backgroundColor: '#1e293b',
          borderColor: '#334155',
          borderWidth: 1,
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          padding: 12,
          callbacks: { label: ctx => ` ${ctx.raw} ครั้ง (${freq[ctx.dataIndex].percentage}%)` }
        }
      },
      scales: {
        x: {
          ticks: { color: '#475569', font: { size: 9, family: 'Sarabun' }, maxRotation: 0 },
          grid: { color: 'rgba(255,255,255,0.03)' },
          border: { color: 'rgba(255,255,255,0.08)' }
        },
        y: {
          ticks: { color: '#94a3b8', font: { family: 'Sarabun', size: 11 } },
          grid: { color: 'rgba(255,255,255,0.06)' },
          border: { color: 'rgba(255,255,255,0.08)' }
        }
      }
    }
  });
}

// ===== HOT / COLD TAB =====
async function loadHotCold() {
  const limit = document.getElementById('hc-limit').value;
  document.getElementById('hot-grid').innerHTML =
    '<div class="loading-wrap"><span class="spinner"></span>กำลังโหลด...</div>';
  document.getElementById('cold-grid').innerHTML = '';

  try {
    const data = await apiFetch(`/api/analysis/hot-cold?limit=${limit}`);
    renderBadges('hot-grid', data.hot, 'hot');
    renderBadges('cold-grid', data.cold, 'cold');
  } catch (err) {
    document.getElementById('hot-grid').innerHTML =
      `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i>${err.message}</div>`;
  }
}

function renderBadges(id, items, type) {
  document.getElementById(id).innerHTML = items.map((item, i) => `
    <div class="num-badge ${type}" style="animation-delay:${i * 0.04}s">
      <span class="nb-num">${item.pair}</span>
      <span class="nb-cnt">${item.count} ครั้ง</span>
      <span class="nb-cnt">${item.percentage}%</span>
    </div>`).join('');
}

// ===== HISTORY TAB =====
async function loadHistory() {
  const limit = document.getElementById('hist-limit').value;
  document.getElementById('history-body').innerHTML =
    `<tr><td colspan="5"><div class="loading-wrap" style="padding:12px 0"><span class="spinner"></span>กำลังโหลด...</div></td></tr>`;

  try {
    const data = await apiFetch(`/api/lottery?limit=${limit}`);
    document.getElementById('history-body').innerHTML = data.data.map(r => `
      <tr>
        <td>${fmt(r.drawDate)}</td>
        <td><span class="td-first">${r.firstPrize}</span></td>
        <td><span class="td-last2">${r.lastTwo}</span></td>
        <td><div class="td-badge">${(r.lastThree || []).map(n => `<span>${n}</span>`).join('')}</div></td>
        <td><div class="td-badge">${(r.frontThree || []).map(n => `<span>${n}</span>`).join('')}</div></td>
      </tr>`).join('');
  } catch (err) {
    document.getElementById('history-body').innerHTML =
      `<tr><td colspan="5" style="color:var(--red);padding:20px"><i class="fa-solid fa-triangle-exclamation"></i> ${err.message}</td></tr>`;
  }
}

// ===== ADD RESULT =====
async function submitResult(e) {
  e.preventDefault();
  const body = {
    drawDate:   document.getElementById('f-date').value,
    firstPrize: document.getElementById('f-first').value,
    lastTwo:    document.getElementById('f-last2').value,
    lastThree:  document.getElementById('f-last3').value.split(',').map(s => s.trim()).filter(Boolean),
    frontThree: document.getElementById('f-front3').value.split(',').map(s => s.trim()).filter(Boolean)
  };
  try {
    const res = await fetch(API + '/api/lottery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
      showMsg('add-msg', 'บันทึกสำเร็จแล้ว', 'success');
      document.getElementById('add-form').reset();
    } else {
      showMsg('add-msg', data.message, 'error');
    }
  } catch (err) {
    showMsg('add-msg', err.message, 'error');
  }
}

// ===== BULK IMPORT =====
async function bulkImport() {
  const raw = document.getElementById('bulk-json').value.trim();
  try {
    const records = JSON.parse(raw);
    const res = await fetch(API + '/api/lottery/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records })
    });
    const data = await res.json();
    if (data.success) {
      showMsg('bulk-msg', `นำเข้าสำเร็จ ${data.inserted} รายการ`, 'success');
    } else {
      showMsg('bulk-msg', data.message, 'error');
    }
  } catch (err) {
    showMsg('bulk-msg', 'JSON ไม่ถูกต้อง: ' + err.message, 'error');
  }
}

// ===== FETCH LATEST FROM API =====
async function fetchLatestData() {
  const btn   = document.getElementById('btn-fetch-latest');
  const badge = document.getElementById('fetch-status-badge');
  btn.classList.add('loading');
  btn.disabled = true;
  badge.className = 'fetch-badge';

  try {
    const res = await fetch('/api/lottery/fetch-latest', { method: 'POST' });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    badge.textContent = 'อัปเดตสำเร็จ';
    badge.className = 'fetch-badge success';

    // รีโหลด UI
    await loadDrawContext();
    await loadHistory();
    loadPredictions();
  } catch (err) {
    badge.textContent = 'ดึงข้อมูลไม่สำเร็จ: ' + err.message;
    badge.className = 'fetch-badge error';
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
    setTimeout(() => { badge.className = 'fetch-badge'; }, 5000);
  }
}

// ===== Auto-load =====
loadDrawContext();
loadPredictions();
loadHistory();
