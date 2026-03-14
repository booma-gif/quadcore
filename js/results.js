// results.js
// Results page logic — reads from localStorage, renders metrics, charts, breakdown, and table

document.addEventListener('DOMContentLoaded', () => {
  const raw = localStorage.getItem('urbaniq_simulation');
  if (!raw) {
    document.getElementById('no-data-msg').style.display = 'block';
    document.getElementById('results-content').style.display = 'none';
    return;
  }

  const data = JSON.parse(raw);
  document.getElementById('results-content').style.display = 'block';
  document.getElementById('no-data-msg').style.display = 'none';

  // Subtitle & badge
  const subtitle = document.getElementById('result-subtitle');
  if (subtitle) subtitle.textContent = `${data.city} — ${new Date(data.timestamp).toLocaleString()} — ${data.policyCount} policies applied`;
  const badge = document.getElementById('result-badge');
  if (badge) {
    badge.textContent = data.recommendation === 'recommended' ? '✅ Recommended' : '⚠️ Needs Revision';
    badge.style.background = data.recommendation === 'recommended' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)';
    badge.style.color = data.recommendation === 'recommended' ? '#22c55e' : '#ef4444';
    badge.style.borderColor = data.recommendation === 'recommended' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)';
  }

  renderMetricCards(data);
  renderBreakdown(data);
  renderCharts(data);
  renderPolicyTable(data);
});


/* ═══════════════════════════════════════
   METRIC CARDS
   ═══════════════════════════════════════ */

function renderMetricCards(data) {
  const container = document.getElementById('metrics-cards-container');
  if (!container) return;

  const metrics = [
    { key: 'congestion', label: 'Traffic Congestion', unit: '/100', icon: '🚦', lower: true },
    { key: 'travelTime', label: 'Travel Time', unit: 'min', icon: '⏱️', lower: true },
    { key: 'energy', label: 'Energy', unit: 'GW', icon: '⚡', lower: true },
    { key: 'co2', label: 'CO₂ Emissions', unit: 'tCO₂', icon: '☁️', lower: true },
    { key: 'accessibility', label: 'Accessibility', unit: '%', icon: '♿', lower: false },
    { key: 'housing', label: 'Housing Affordability', unit: '/100', icon: '🏘️', lower: false },
    { key: 'cost', label: 'Budget', unit: '$', icon: '💰', lower: true },
    { key: 'roadHealth', label: 'Road Health', unit: '/100', icon: '🛣️', lower: false }
  ];

  container.innerHTML = metrics.map((m, idx) => {
    const base = data.baseline[m.key];
    const fin = data.final[m.key];
    const delta = fin - base;
    const pct = ((delta / base) * 100);
    const isGood = m.lower ? delta < 0 : delta > 0;
    const isCost = m.key === 'cost';

    let baseDisplay = isCost ? `$${(base/1000000).toFixed(1)}M` : base.toFixed(1);
    let finDisplay = isCost ? `$${(fin/1000000).toFixed(1)}M` : fin.toFixed(1);
    let absDisplay = isCost ? `${delta > 0 ? '+' : ''}$${(delta/1000000).toFixed(1)}M` : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} ${m.unit}`;
    let pctDisplay = `${pct > 0 ? '↑' : '↓'} ${Math.abs(pct).toFixed(1)}%`;
    let pctClass = (isGood && !isCost) ? 'green' : (delta === 0 ? 'green' : 'red');
    if (isCost) pctClass = delta <= 0 ? 'green' : 'red';

    // Sparkbar widths (normalize to max of baseline or final)
    const maxVal = Math.max(base, fin);
    const beforeWidth = maxVal > 0 ? (base / maxVal * 100) : 50;
    const afterWidth = maxVal > 0 ? (fin / maxVal * 100) : 50;
    const afterColor = (isGood && !isCost) ? '#22c55e' : '#ef4444';

    return `
      <div class="result-metric-card" style="animation-delay:${idx * 150}ms; opacity:0; animation: fadeInUp 0.5s ease ${idx * 150}ms forwards;">
        <div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px;">${m.icon} ${m.label}</div>
        <div class="baseline-val">Baseline: ${baseDisplay}</div>
        <div class="final-val" id="final-val-${m.key}">0</div>
        <div class="abs-change" style="color:${afterColor}">${absDisplay}</div>
        <div class="pct-badge ${pctClass}">${pctDisplay}</div>
        <div class="spark-bar">
          <div class="before" style="width:${beforeWidth}%"></div>
          <div class="after" style="width:${afterWidth}%; background:${afterColor}"></div>
        </div>
      </div>
    `;
  }).join('');

  // Add fadeInUp keyframes if not exist
  if (!document.getElementById('fadeInUp-style')) {
    const style = document.createElement('style');
    style.id = 'fadeInUp-style';
    style.textContent = `@keyframes fadeInUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }`;
    document.head.appendChild(style);
  }

  // Animate count-up for final values
  metrics.forEach((m, idx) => {
    const el = document.getElementById(`final-val-${m.key}`);
    if (!el) return;
    const fin = data.final[m.key];
    const isCost = m.key === 'cost';
    setTimeout(() => {
      animateValue(el, 0, fin, 1000, isCost);
    }, idx * 150 + 300);
  });
}

function animateValue(el, start, end, duration, isCost) {
  const startTime = performance.now();
  const step = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start + (end - start) * eased;
    el.textContent = isCost ? `$${(current/1000000).toFixed(1)}M` : current.toFixed(1);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}


/* ═══════════════════════════════════════
   BREAKDOWN SECTION
   ═══════════════════════════════════════ */

function renderBreakdown(data) {
  const container = document.getElementById('breakdown-container');
  if (!container) return;

  const rows = [];

  // Bus routes
  if (data.policies.busRoutes && data.policies.busRoutes.length > 0) {
    data.policies.busRoutes.forEach(r => {
      const impacts = [];
      if (r.impact.co2) impacts.push({ label: `CO₂ ${r.impact.co2 > 0 ? '↑' : '↓'} ${Math.abs(r.impact.co2).toFixed(0)}%`, positive: r.impact.co2 < 0 });
      if (r.impact.travelTime) impacts.push({ label: `Travel ${r.impact.travelTime > 0 ? '↑' : '↓'} ${Math.abs(r.impact.travelTime).toFixed(0)}%`, positive: r.impact.travelTime < 0 });
      if (r.impact.accessibility) impacts.push({ label: `Access ↑ ${r.impact.accessibility}%`, positive: true });
      rows.push({ emoji: '🚌', name: `${r.name} (${r.type}, every ${r.frequency}min)`, impacts });
    });
  }

  // Traffic regions
  if (data.policies.trafficRegions && data.policies.trafficRegions.length > 0) {
    data.policies.trafficRegions.forEach(r => {
      const impacts = [];
      if (r.impact.travelTime) impacts.push({ label: `Travel Time ${r.impact.travelTime > 0 ? '↑' : '↓'} ${Math.abs(r.impact.travelTime)}%`, positive: r.impact.travelTime < 0 });
      if (r.impact.co2) impacts.push({ label: `CO₂ ${r.impact.co2 > 0 ? '↑' : '↓'} ${Math.abs(r.impact.co2)}%`, positive: r.impact.co2 < 0 });
      const levelColors = { low: '#22c55e', medium: '#eab308', high: '#ef4444', critical: '#7c3aed' };
      rows.push({ emoji: `<span style="color:${levelColors[r.level] || '#ef4444'}">●</span>`, name: `${r.level.charAt(0).toUpperCase()+r.level.slice(1)} Traffic Region (${r.vehicles} veh/hr)`, impacts });
    });
  }

  // Infrastructure
  if (data.policies.infrastructure && data.policies.infrastructure.length > 0) {
    data.policies.infrastructure.forEach(inf => {
      const impacts = [];
      Object.entries(inf.impact).forEach(([k, v]) => {
        if (k === 'cost') return;
        const label = k === 'co2' ? 'CO₂' : k === 'travelTime' ? 'Travel' : k === 'accessibility' ? 'Access' : k;
        impacts.push({ label: `${label} ${v > 0 ? '↑' : '↓'} ${Math.abs(v)}%`, positive: ['co2','travelTime','energy'].includes(k) ? v < 0 : v > 0 });
      });
      rows.push({ emoji: inf.emoji, name: inf.name, impacts });
    });
  }

  // Environment toggles
  if (data.policies.bikeLanes) rows.push({ emoji: '🚲', name: 'Bike Lanes (Active)', impacts: [{ label: 'CO₂ ↓', positive: true }] });
  if (data.policies.greenSpaces) rows.push({ emoji: '🌳', name: 'Green Spaces (Active)', impacts: [{ label: 'CO₂ ↓', positive: true }] });
  if (data.policies.evStations) rows.push({ emoji: '🔌', name: 'EV Stations (Active)', impacts: [{ label: 'Energy ↓', positive: true }] });

  if (rows.length === 0) {
    container.innerHTML = '<div class="text-secondary text-center" style="padding:20px;">No specific policies to break down</div>';
    return;
  }

  container.innerHTML = rows.map(r => `
    <div class="breakdown-row">
      <span class="emoji">${r.emoji}</span>
      <span class="policy-name">${r.name}</span>
      <span class="impact-badges">${r.impacts.map(i => `<span class="impact-tag ${i.positive ? 'positive' : 'negative'}">${i.label}</span>`).join('')}</span>
    </div>
  `).join('');
}


/* ═══════════════════════════════════════
   CHARTS
   ═══════════════════════════════════════ */

const chartInstances = {};

function destroyChart(id) {
  if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }
}

function renderCharts(data) {
  Chart.defaults.color = '#7ab89a';
  Chart.defaults.font.family = "'Inter', sans-serif";

  const tooltipStyle = {
    backgroundColor: 'rgba(10,10,15,0.9)',
    borderColor: 'rgba(139,92,246,0.3)',
    borderWidth: 1,
    titleColor: '#a78bfa',
    bodyColor: '#e2e8f0',
    cornerRadius: 8,
    padding: 10
  };

  renderBarChart(data, tooltipStyle);
  renderLineChart(data, tooltipStyle);
  renderHorizontalChart(data, tooltipStyle);
  renderRadarChart(data, tooltipStyle);
}

function renderBarChart(data, tooltipStyle) {
  destroyChart('chart-bar');
  const labels = ['Congestion', 'Travel Time', 'CO₂', 'Energy', 'Accessibility', 'Housing', 'Cost ($M)', 'Road Health'];
  const baseData = [data.baseline.congestion, data.baseline.travelTime, data.baseline.co2, data.baseline.energy, data.baseline.accessibility, data.baseline.housing, data.baseline.cost / 1000000, data.baseline.roadHealth];
  const finalData = [data.final.congestion, data.final.travelTime, data.final.co2, data.final.energy, data.final.accessibility, data.final.housing, data.final.cost / 1000000, data.final.roadHealth];

  chartInstances['chart-bar'] = new Chart(document.getElementById('chart-bar'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Before (Baseline)', data: baseData, backgroundColor: 'rgba(122,184,154,0.3)', borderColor: '#7ab89a', borderWidth: 1 },
        { label: 'After (Policy)', data: finalData, backgroundColor: 'rgba(139,92,246,0.6)', borderColor: '#7c3aed', borderWidth: 1 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 1000, easing: 'easeOutQuart' },
      scales: {
        x: { grid: { color: '#1a2e22' } },
        y: { grid: { color: '#1a2e22' } }
      },
      plugins: {
        legend: { position: 'bottom' },
        tooltip: tooltipStyle,
        datalabels: false
      }
    },
    plugins: [{
      id: 'barLabels',
      afterDatasetsDraw(chart) {
        const ctx = chart.ctx;
        chart.data.datasets.forEach((dataset, i) => {
          const meta = chart.getDatasetMeta(i);
          meta.data.forEach((bar, index) => {
            const value = dataset.data[index];
            ctx.fillStyle = '#e2e8f0';
            ctx.font = '10px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(value.toFixed(1), bar.x, bar.y - 5);
          });
        });
      }
    }]
  });
}

function renderLineChart(data, tooltipStyle) {
  destroyChart('chart-line');
  const labels = Array.from({ length: 12 }, (_, i) => `Month ${i + 1}`);
  const metricColors = {
    congestion: '#e05050',
    travelTime: '#7c3aed',
    co2: '#06b6d4',
    energy: '#a78bfa',
    accessibility: '#22c55e',
    housing: '#00c896',
    cost: '#f59e0b',
    roadHealth: '#4CAF50'
  };

  const datasets = Object.entries(data.baseline).map(([key, baseVal]) => {
    const finalVal = data.final[key];
    const delta = finalVal - baseVal;
    const points = Array.from({ length: 12 }, (_, i) => {
      return Number((baseVal + delta * ((i + 1) / 12)).toFixed(2));
    });
    const displayKey = key === 'travelTime' ? 'Travel Time' : key === 'co2' ? 'CO₂' : key.charAt(0).toUpperCase() + key.slice(1);
    return {
      label: displayKey,
      data: points,
      borderColor: metricColors[key] || '#7c3aed',
      backgroundColor: 'transparent',
      tension: 0.4,
      pointRadius: 3,
      pointBackgroundColor: metricColors[key] || '#7c3aed',
      borderWidth: 2
    };
  });

  chartInstances['chart-line'] = new Chart(document.getElementById('chart-line'), {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 1000, easing: 'easeOutQuart' },
      scales: {
        x: { grid: { color: '#1a2e22' } },
        y: { grid: { color: '#1a2e22' } }
      },
      plugins: { legend: { position: 'bottom' }, tooltip: tooltipStyle }
    }
  });
}

function renderHorizontalChart(data, tooltipStyle) {
  destroyChart('chart-horizontal');
  const items = [];
  const categoryColors = { Transport: '#7c3aed', Infrastructure: '#06b6d4', Environment: '#22c55e', Traffic: '#ef4444' };

  // Compute per-policy total improvement percentage
  if (data.policies.busRoutes) {
    data.policies.busRoutes.forEach(r => {
      const totalImpact = Object.values(r.impact).reduce((s, v) => s + Math.abs(v), 0);
      items.push({ name: `🚌 ${r.name}`, value: totalImpact, color: categoryColors.Transport });
    });
  }
  if (data.policies.trafficRegions) {
    data.policies.trafficRegions.forEach(r => {
      const totalImpact = Object.values(r.impact).reduce((s, v) => s + Math.abs(v), 0);
      items.push({ name: `● ${r.level} Traffic`, value: totalImpact, color: categoryColors.Traffic });
    });
  }
  if (data.policies.infrastructure) {
    data.policies.infrastructure.forEach(inf => {
      const totalImpact = Object.entries(inf.impact).filter(([k]) => k !== 'cost').reduce((s, [, v]) => s + Math.abs(v), 0);
      items.push({ name: `${inf.emoji} ${inf.name}`, value: totalImpact, color: categoryColors.Infrastructure });
    });
  }

  // Sort by value descending
  items.sort((a, b) => b.value - a.value);

  if (items.length === 0) {
    items.push({ name: 'No policies', value: 0, color: '#7ab89a' });
  }

  chartInstances['chart-horizontal'] = new Chart(document.getElementById('chart-horizontal'), {
    type: 'bar',
    data: {
      labels: items.map(i => i.name),
      datasets: [{
        label: 'Total Impact (%)',
        data: items.map(i => i.value),
        backgroundColor: items.map(i => i.color + '99'),
        borderColor: items.map(i => i.color),
        borderWidth: 1
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 1000, easing: 'easeOutQuart' },
      scales: {
        x: { grid: { color: '#1a2e22' } },
        y: { grid: { color: '#1a2e22' }, ticks: { font: { size: 11 } } }
      },
      plugins: { legend: { display: false }, tooltip: tooltipStyle }
    }
  });
}

function renderRadarChart(data, tooltipStyle) {
  destroyChart('chart-radar');
  const axes = ['Mobility', 'Environment', 'Accessibility', 'Economy', 'Energy', 'Livability', 'Congestion', 'Housing'];

  // Calculate scores 0-100 from metrics
  function calcScores(metrics) {
    const mobility = Math.max(0, Math.min(100, 100 - (metrics.travelTime / 50 * 100)));
    const environment = Math.max(0, Math.min(100, 100 - (metrics.co2 / 500 * 100)));
    const accessibility = Math.max(0, Math.min(100, metrics.accessibility));
    const economy = Math.max(0, Math.min(100, 50));
    const energy = Math.max(0, Math.min(100, 100 - (metrics.energy / 5 * 100)));
    const livability = Math.max(0, Math.min(100, (mobility + environment + accessibility) / 3));
    const congestion = Math.max(0, Math.min(100, 100 - (metrics.congestion || 65)));
    const housing = Math.max(0, Math.min(100, metrics.housing || 50));
    return [mobility, environment, accessibility, economy, energy, livability, congestion, housing];
  }

  const beforeScores = calcScores(data.baseline);
  const afterScores = calcScores(data.final);

  chartInstances['chart-radar'] = new Chart(document.getElementById('chart-radar'), {
    type: 'radar',
    data: {
      labels: axes,
      datasets: [
        {
          label: 'Before',
          data: beforeScores,
          backgroundColor: 'rgba(122,184,154,0.15)',
          borderColor: '#7ab89a',
          pointBackgroundColor: '#7ab89a',
          borderWidth: 2
        },
        {
          label: 'After',
          data: afterScores,
          backgroundColor: 'rgba(139,92,246,0.2)',
          borderColor: '#7c3aed',
          pointBackgroundColor: '#7c3aed',
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 1000, easing: 'easeOutQuart' },
      scales: {
        r: {
          angleLines: { color: '#1a2e22' },
          grid: { color: '#1a2e22' },
          pointLabels: { color: '#7ab89a', font: { size: 11 } },
          ticks: { display: false },
          suggestedMin: 0, suggestedMax: 100
        }
      },
      plugins: { legend: { position: 'bottom' }, tooltip: tooltipStyle }
    }
  });
}


/* ═══════════════════════════════════════
   POLICY TABLE
   ═══════════════════════════════════════ */

function renderPolicyTable(data) {
  const tbody = document.getElementById('policy-table-body');
  if (!tbody) return;

  const rows = [];

  if (data.policies.busRoutes) {
    data.policies.busRoutes.forEach(r => {
      const keyChange = r.impact.co2 ? `CO₂ ${r.impact.co2 > 0 ? '+' : ''}${r.impact.co2}%` : '—';
      rows.push(`<tr>
        <td>🚌 ${r.name}</td>
        <td>Transport</td>
        <td><span class="impact-tag ${Math.abs(r.impact.travelTime || 0) > 10 ? 'positive' : 'positive'}">High</span></td>
        <td>${keyChange}</td>
        <td><span class="impact-tag positive">Active</span></td>
      </tr>`);
    });
  }

  if (data.policies.trafficRegions) {
    data.policies.trafficRegions.forEach(r => {
      const keyChange = `Travel ${r.impact.travelTime > 0 ? '+' : ''}${r.impact.travelTime}%`;
      const impactLevel = r.level === 'critical' || r.level === 'high' ? 'negative' : 'positive';
      rows.push(`<tr>
        <td>🚗 ${r.level.charAt(0).toUpperCase()+r.level.slice(1)} Traffic (${r.vehicles} veh/hr)</td>
        <td>Traffic</td>
        <td><span class="impact-tag ${impactLevel}">${r.level.charAt(0).toUpperCase()+r.level.slice(1)}</span></td>
        <td>${keyChange}</td>
        <td><span class="impact-tag ${impactLevel}">Active</span></td>
      </tr>`);
    });
  }

  if (data.policies.infrastructure) {
    data.policies.infrastructure.forEach(inf => {
      const mainImpact = Object.entries(inf.impact).filter(([k]) => k !== 'cost').sort((a,b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
      const keyChange = mainImpact ? `${mainImpact[0]} ${mainImpact[1] > 0 ? '+' : ''}${mainImpact[1]}%` : '—';
      rows.push(`<tr>
        <td>${inf.emoji} ${inf.name}</td>
        <td>Infrastructure</td>
        <td><span class="impact-tag positive">Placed</span></td>
        <td>${keyChange}</td>
        <td><span class="impact-tag positive">Active</span></td>
      </tr>`);
    });
  }

  if (data.policies.bikeLanes) rows.push(`<tr><td>🚲 Bike Lanes</td><td>Environment</td><td><span class="impact-tag positive">Low</span></td><td>CO₂ ↓</td><td><span class="impact-tag positive">Active</span></td></tr>`);
  if (data.policies.greenSpaces) rows.push(`<tr><td>🌳 Green Spaces</td><td>Environment</td><td><span class="impact-tag positive">Low</span></td><td>CO₂ ↓</td><td><span class="impact-tag positive">Active</span></td></tr>`);
  if (data.policies.evStations) rows.push(`<tr><td>🔌 EV Stations</td><td>Environment</td><td><span class="impact-tag positive">Medium</span></td><td>Energy ↓</td><td><span class="impact-tag positive">Active</span></td></tr>`);

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-secondary" style="padding:20px;">No policies to display</td></tr>';
    return;
  }
  tbody.innerHTML = rows.join('');
}


/* ═══════════════════════════════════════
   PDF EXPORT
   ═══════════════════════════════════════ */

async function exportPDF() {
  const btn = document.getElementById('btn-pdf');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Generating...'; }

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const data = JSON.parse(localStorage.getItem('urbaniq_simulation'));
    if (!data) { alert('No simulation data found'); return; }

    const pageWidth = 210;
    let y = 15;

    // Title
    doc.setFontSize(20);
    doc.setTextColor(0, 200, 150);
    doc.text('CitySimulate — Simulation Results', pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`${data.city} | ${new Date(data.timestamp).toLocaleString()} | ${data.policyCount} policies`, pageWidth / 2, y, { align: 'center' });
    y += 15;

    // Metrics summary
    doc.setFontSize(14);
    doc.setTextColor(200, 200, 200);
    doc.text('Metrics Summary', 15, y);
    y += 8;

    const metricLabels = { congestion: 'Traffic Congestion', travelTime: 'Travel Time', co2: 'CO₂ Emissions', energy: 'Energy', accessibility: 'Accessibility', housing: 'Housing Affordability', cost: 'Budget', roadHealth: 'Road Health' };
    Object.entries(data.baseline).forEach(([key, baseVal]) => {
      const finalVal = data.final[key];
      const delta = finalVal - baseVal;
      const pct = ((delta / baseVal) * 100).toFixed(1);
      const label = metricLabels[key] || key;
      const isCost = key === 'cost';
      const baseStr = isCost ? `$${(baseVal/1000000).toFixed(1)}M` : baseVal.toFixed(1);
      const finalStr = isCost ? `$${(finalVal/1000000).toFixed(1)}M` : finalVal.toFixed(1);

      doc.setFontSize(10);
      doc.setTextColor(180, 180, 180);
      doc.text(`${label}: ${baseStr} → ${finalStr} (${pct > 0 ? '+' : ''}${pct}%)`, 20, y);
      y += 6;
    });
    y += 10;

    // Policy breakdown
    doc.setFontSize(14);
    doc.setTextColor(200, 200, 200);
    doc.text('Policy Breakdown', 15, y);
    y += 8;

    const allPolicies = [
      ...(data.policies.busRoutes || []).map(r => `Bus Route: ${r.name} (${r.type})`),
      ...(data.policies.trafficRegions || []).map(r => `Traffic Region: ${r.level} (${r.vehicles} veh/hr)`),
      ...(data.policies.infrastructure || []).map(i => `Infrastructure: ${i.emoji} ${i.name}`)
    ];

    if (allPolicies.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('No specific policies applied', 20, y);
      y += 6;
    } else {
      allPolicies.forEach(p => {
        if (y > 270) { doc.addPage(); y = 15; }
        doc.setFontSize(9);
        doc.setTextColor(170, 170, 170);
        doc.text(`• ${p}`, 20, y);
        y += 5;
      });
    }
    y += 10;

    // Add chart images
    const chartIds = ['chart-bar', 'chart-line', 'chart-horizontal', 'chart-radar'];
    for (const chartId of chartIds) {
      if (chartInstances[chartId]) {
        if (y > 180) { doc.addPage(); y = 15; }
        const imgData = chartInstances[chartId].toBase64Image();
        doc.addImage(imgData, 'PNG', 15, y, 180, 80);
        y += 90;
      }
    }

    // Recommendation
    doc.addPage();
    y = 20;
    doc.setFontSize(16);
    doc.setTextColor(0, 200, 150);
    doc.text(`Recommendation: ${data.recommendation === 'recommended' ? '✅ Recommended' : '⚠️ Needs Revision'}`, 15, y);
    y += 10;
    doc.setFontSize(11);
    doc.setTextColor(180, 180, 180);
    doc.text(`Overall improvement: ${data.improvementPercent}%`, 15, y);

    doc.save(`CitySimulate_Results_${new Date().toISOString().slice(0,10)}.pdf`);
    console.log('[PDF] Export complete');
  } catch(e) {
    console.error('[PDF] Export failed:', e);
    alert('PDF export failed. Please try again.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '📄 Export PDF'; }
  }
}
