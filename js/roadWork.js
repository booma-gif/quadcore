// roadWork.js
// Road Work tool for CitySimulate - mark roads as under construction

/* ═══════════════════════════════════════
   ROAD WORK MANAGER
   ═══════════════════════════════════════ */

const RoadWorkManager = {
  works: [],
  modeActive: false,
  selectedIntensity: 'minor',
  layerGroup: null,
  map: null,
  _clickHandler: null,

  roadNames: [
    'High Street', 'King Street', 'Queen Street',
    'Church Road', 'Station Road', 'Park Lane',
    'Victoria Road', 'London Road', 'Mill Lane',
    'Bridge Street', 'Manor Road', 'Grove Street',
    'Hill Road', 'Green Lane', 'West Street',
    'East Avenue', 'North Road', 'South Street',
    'Market Street', 'Broadway'
  ],

  impacts: {
    'minor': {
      travelTime: 8,
      travelTimeMultiplier: 1.15,
      accessibility: -6,
      co2: 12,
      energy: 8
    },
    'moderate': {
      travelTime: 18,
      travelTimeMultiplier: 1.35,
      accessibility: -14,
      co2: 28,
      energy: 18
    },
    'major': {
      travelTime: 35,
      travelTimeMultiplier: 1.65,
      accessibility: -25,
      co2: 52,
      energy: 35
    },
    'full-closure': {
      travelTime: 65,
      travelTimeMultiplier: 2.2,
      accessibility: -42,
      co2: 95,
      energy: 65
    }
  },

  init(map) {
    this.map = map;
    this.layerGroup = L.layerGroup().addTo(map);
    this._bindIntensityButtons();
    this._bindSelectButton();
    this._bindClearButton();
    console.log('[RoadWorkManager] Initialized');
  },

  getImpactValues(intensity) {
    return this.impacts[intensity] || this.impacts['minor'];
  },

  _bindIntensityButtons() {
    document.querySelectorAll('#road-work-content .intensity-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#road-work-content .intensity-btn')
          .forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedIntensity = btn.dataset.intensity;
      });
    });
  },

  _bindSelectButton() {
    const btn = document.getElementById('btn-select-road-work');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (this.modeActive) {
        this._deactivateMode();
      } else {
        this._activateMode();
      }
    });
  },

  _bindClearButton() {
    const btn = document.getElementById('btn-clear-road-work');
    if (!btn) return;
    btn.addEventListener('click', () => {
      this.clearAll();
    });
  },

  _activateMode() {
    this.modeActive = true;
    const btn = document.getElementById('btn-select-road-work');
    if (btn) {
      btn.textContent = '🚧 Click a road on map';
      btn.classList.add('active');
    }

    // Show active indicator
    const list = document.getElementById('road-work-list');
    if (list) {
      let indicator = document.getElementById('rw-active-indicator');
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'rw-active-indicator';
        indicator.className = 'road-work-active-indicator';
        indicator.innerHTML = '<div class="road-work-pulse"></div> Click any road on the map';
        list.parentNode.insertBefore(indicator, list);
      }
    }

    this.map.getContainer().style.cursor = 'crosshair';

    this._clickHandler = (e) => {
      this._placeRoadWork(e.latlng);
    };
    this.map.on('click', this._clickHandler);
  },

  _deactivateMode() {
    this.modeActive = false;
    const btn = document.getElementById('btn-select-road-work');
    if (btn) {
      btn.textContent = '🚧 Select Road';
      btn.classList.remove('active');
    }

    // Remove active indicator
    const indicator = document.getElementById('rw-active-indicator');
    if (indicator) indicator.remove();

    this.map.getContainer().style.cursor = '';
    if (this._clickHandler) {
      this.map.off('click', this._clickHandler);
      this._clickHandler = null;
    }
  },

  _placeRoadWork(latlng) {
    const idx = Math.floor(
      (latlng.lat * 1000 + latlng.lng * 1000) % this.roadNames.length
    );
    const roadName = this.roadNames[Math.abs(idx)];
    const intensity = this.selectedIntensity;
    const impact = this.getImpactValues(intensity);

    const icon = L.divIcon({
      html: '<div style="font-size:20px;">🚧</div>',
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const marker = L.marker(latlng, { icon }).addTo(this.layerGroup);

    marker.bindPopup(
      '<b>🚧 Road Work</b><br>' +
      roadName + '<br>' +
      'Intensity: ' + intensity + '<br>' +
      'Impact: Travel time +' + impact.travelTime + ' mins'
    );

    const id = Date.now() + Math.random();
    const entry = {
      id: id,
      name: roadName,
      intensity: intensity,
      latlng: latlng,
      marker: marker
    };

    this.works.push(entry);
    this._updateList();
    this._deactivateMode();

    // Re-trigger metric aggregation
    if (typeof MetricAggregator !== 'undefined') {
      MetricAggregator.recalculate();
    }

    console.log(`[RoadWork] Placed "${roadName}" (${intensity}), total: ${this.works.length}`);
  },

  removeWork(id) {
    const idx = this.works.findIndex(rw => rw.id === id);
    if (idx === -1) return;

    this.layerGroup.removeLayer(this.works[idx].marker);
    this.works.splice(idx, 1);
    this._updateList();

    if (typeof MetricAggregator !== 'undefined') {
      MetricAggregator.recalculate();
    }

    console.log(`[RoadWork] Removed, remaining: ${this.works.length}`);
  },

  clearAll() {
    this.layerGroup.clearLayers();
    this.works.length = 0;
    this._updateList();

    if (typeof MetricAggregator !== 'undefined') {
      MetricAggregator.recalculate();
    }

    console.log('[RoadWork] Cleared all');
  },

  _updateList() {
    const list = document.getElementById('road-work-list');
    const clearBtn = document.getElementById('btn-clear-road-work');
    if (!list) return;

    if (this.works.length === 0) {
      list.innerHTML = '<p class="no-items-text" id="no-road-work-text">No road works added yet</p>';
      if (clearBtn) clearBtn.style.display = 'none';
      return;
    }

    if (clearBtn) clearBtn.style.display = 'block';

    list.innerHTML = this.works.map(rw => `
      <div class="road-work-item" id="rw-${rw.id}">
        <div class="item-label">
          <span class="item-name">🚧 ${rw.name}</span>
          <span class="item-intensity">${rw.intensity}</span>
        </div>
        <button class="item-delete" onclick="RoadWorkManager.removeWork(${rw.id})">✕</button>
      </div>
    `).join('');
  },

  getImpact() {
    let impact = { travelTime: 0, co2: 0, energy: 0, accessibility: 0, congestion: 0, housing: 0, roadHealth: 0 };

    this.works.forEach(rw => {
      const vals = this.getImpactValues(rw.intensity);
      // Convert flat values to percentage deltas relative to MetricAggregator baseline
      impact.travelTime += (vals.travelTime / 28) * 100; // baseline travelTime is 28
      impact.co2 += (vals.co2 / 340) * 100; // baseline co2 is 340
      impact.energy += (vals.energy / 2.4) * 100; // baseline energy is 2.4
      impact.accessibility += vals.accessibility;
      impact.congestion += vals.travelTime * 0.5; // road work increases congestion
      impact.roadHealth -= vals.travelTime * 0.3; // road work means road is being fixed but temporarily bad
    });

    // Multiple road works compound exponentially on travel time
    if (this.works.length > 1) {
      const compoundMultiplier = Math.pow(1.12, this.works.length - 1);
      impact.travelTime *= compoundMultiplier;
    }

    return impact;
  },

  getDataForSave() {
    return this.works.map(rw => ({
      name: rw.name,
      intensity: rw.intensity,
      latlng: [rw.latlng.lat, rw.latlng.lng],
      impact: this.getImpactValues(rw.intensity)
    }));
  }
};

// Expose globally
window.RoadWorkManager = RoadWorkManager;
window.getImpactValues = function(intensity) {
  return RoadWorkManager.getImpactValues(intensity);
};
window.roadWorks = RoadWorkManager.works;


/* ═══════════════════════════════════════
   ROAD WORK ROUTE DRAWING
   ═══════════════════════════════════════ */

const RoadWorkRoute = {
  startPoint: null,
  endPoint: null,
  startMarker: null,
  endMarker: null,
  routeLine: null,
  routeOverlay: null,
  selectingPoint: null, // 'start' or 'end'
  map: null,

  startIcon: null,
  endIcon: null,

  init(map) {
    this.map = map;

    this.startIcon = L.divIcon({
      html: '<div style="width:14px;height:14px;border-radius:50%;background:#00c896;border:2px solid #0a0f0d;box-shadow:0 0 8px rgba(0,200,150,0.7);"></div>',
      className: '',
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    this.endIcon = L.divIcon({
      html: '<div style="width:14px;height:14px;border-radius:50%;background:#e05050;border:2px solid #0a0f0d;box-shadow:0 0 8px rgba(224,80,80,0.7);"></div>',
      className: '',
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    this._bindButtons();
    this._bindMapClick();
    console.log('[RoadWorkRoute] Initialized');
  },

  _bindButtons() {
    const startBtn = document.getElementById('btn-rw-start');
    const endBtn = document.getElementById('btn-rw-end');
    const drawBtn = document.getElementById('btn-rw-draw-route');
    const clearBtn = document.getElementById('btn-rw-clear-route');

    if (startBtn) {
      startBtn.addEventListener('click', () => this._togglePointSelection('start'));
    }
    if (endBtn) {
      endBtn.addEventListener('click', () => this._togglePointSelection('end'));
    }
    if (drawBtn) {
      drawBtn.addEventListener('click', () => this._drawRoute());
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this._clearRoute());
    }
  },

  _togglePointSelection(which) {
    const startBtn = document.getElementById('btn-rw-start');
    const endBtn = document.getElementById('btn-rw-end');

    // If already selecting this point, cancel
    if (this.selectingPoint === which) {
      this.selectingPoint = null;
      if (which === 'start') {
        startBtn.classList.remove('rw-selecting');
        startBtn.innerHTML = '<span class="rw-point-dot rw-start-dot"></span> Set Start Point';
      } else {
        endBtn.classList.remove('rw-selecting');
        endBtn.innerHTML = '<span class="rw-point-dot rw-end-dot"></span> Set End Point';
      }
      this.map.getContainer().style.cursor = '';
      return;
    }

    // Cancel other selection if active
    if (this.selectingPoint === 'start') {
      startBtn.classList.remove('rw-selecting');
      startBtn.innerHTML = '<span class="rw-point-dot rw-start-dot"></span> Set Start Point';
    } else if (this.selectingPoint === 'end') {
      endBtn.classList.remove('rw-selecting');
      endBtn.innerHTML = '<span class="rw-point-dot rw-end-dot"></span> Set End Point';
    }

    // Activate selection
    this.selectingPoint = which;
    if (which === 'start') {
      startBtn.classList.remove('rw-set');
      startBtn.classList.add('rw-selecting');
      startBtn.innerHTML = '<span class="rw-point-dot rw-start-dot"></span> Click map...';
    } else {
      endBtn.classList.remove('rw-set');
      endBtn.classList.add('rw-selecting');
      endBtn.innerHTML = '<span class="rw-point-dot rw-end-dot"></span> Click map...';
    }
    this.map.getContainer().style.cursor = 'crosshair';
  },

  _bindMapClick() {
    this.map.on('click', (e) => {
      if (!this.selectingPoint) return;
      // Don't interfere with road work placement mode
      if (RoadWorkManager.modeActive) return;

      const latlng = e.latlng;

      if (this.selectingPoint === 'start') {
        if (this.startMarker) this.map.removeLayer(this.startMarker);
        this.startMarker = L.marker(latlng, { icon: this.startIcon }).addTo(this.map);
        this.startMarker.bindPopup(
          '<b style="color:#00c896">🟢 Road Work Start</b><br>' +
          'Lat: ' + latlng.lat.toFixed(4) + '<br>' +
          'Lng: ' + latlng.lng.toFixed(4)
        );
        this.startPoint = latlng;

        const startBtn = document.getElementById('btn-rw-start');
        startBtn.classList.remove('rw-selecting');
        startBtn.classList.add('rw-set');
        startBtn.innerHTML = '<span class="rw-point-dot rw-start-dot"></span> Start Set ✓';

        const startStatus = document.getElementById('rw-start-status');
        startStatus.textContent = latlng.lat.toFixed(3) + ', ' + latlng.lng.toFixed(3);
        startStatus.classList.add('rw-status-set');

      } else if (this.selectingPoint === 'end') {
        if (this.endMarker) this.map.removeLayer(this.endMarker);
        this.endMarker = L.marker(latlng, { icon: this.endIcon }).addTo(this.map);
        this.endMarker.bindPopup(
          '<b style="color:#e05050">🔴 Road Work End</b><br>' +
          'Lat: ' + latlng.lat.toFixed(4) + '<br>' +
          'Lng: ' + latlng.lng.toFixed(4)
        );
        this.endPoint = latlng;

        const endBtn = document.getElementById('btn-rw-end');
        endBtn.classList.remove('rw-selecting');
        endBtn.classList.add('rw-set');
        endBtn.innerHTML = '<span class="rw-point-dot rw-end-dot"></span> End Set ✓';

        const endStatus = document.getElementById('rw-end-status');
        endStatus.textContent = latlng.lat.toFixed(3) + ', ' + latlng.lng.toFixed(3);
        endStatus.classList.add('rw-status-set');
      }

      this.selectingPoint = null;
      this.map.getContainer().style.cursor = '';

      // Enable draw button if both points set
      if (this.startPoint && this.endPoint) {
        const drawBtn = document.getElementById('btn-rw-draw-route');
        drawBtn.disabled = false;
        drawBtn.textContent = 'Draw Road Work Route';
      }
    });
  },

  _drawRoute() {
    if (!this.startPoint || !this.endPoint) return;

    // Remove existing route if any
    if (this.routeLine) this.map.removeLayer(this.routeLine);
    if (this.routeOverlay) this.map.removeLayer(this.routeOverlay);

    const points = this._generateRoutePoints(this.startPoint, this.endPoint);

    // Main dashed red route line
    this.routeLine = L.polyline(points, {
      color: '#e05050',
      weight: 5,
      opacity: 0.85,
      dashArray: '10, 6',
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(this.map);

    // Thinner animated overlay
    this.routeOverlay = L.polyline(points, {
      color: '#ff6b6b',
      weight: 2,
      opacity: 0.6,
      dashArray: '4, 8',
      lineCap: 'round'
    }).addTo(this.map);

    // Route popup with impact info
    const distanceKm = this._calculateDistance(this.startPoint, this.endPoint).toFixed(2);
    const intensity = RoadWorkManager.selectedIntensity || 'minor';
    const impact = RoadWorkManager.getImpactValues(intensity);

    this.routeLine.bindPopup(
      '<div style="min-width:180px">' +
      '<b style="color:#e05050">🚧 Road Work Zone</b><br>' +
      '<hr style="border-color:#1a2e22;margin:6px 0">' +
      'Distance: <b>' + distanceKm + ' km</b><br>' +
      'Intensity: <b style="color:#FF9800">' +
        intensity.charAt(0).toUpperCase() + intensity.slice(1) + '</b><br>' +
      '<hr style="border-color:#1a2e22;margin:6px 0">' +
      '<span style="color:#e05050">Impact:</span><br>' +
      '⏱ Travel time +' + impact.travelTime + ' min<br>' +
      '♿ Accessibility ' + impact.accessibility + '<br>' +
      '🌿 CO₂ +' + impact.co2 + '<br>' +
      '⚡ Energy +' + impact.energy +
      '</div>'
    );

    // Fit map to show route
    const bounds = L.latLngBounds([this.startPoint, this.endPoint]);
    this.map.fitBounds(bounds, { padding: [60, 60] });

    // Show clear button, update draw button
    document.getElementById('btn-rw-clear-route').style.display = 'block';
    const drawBtn = document.getElementById('btn-rw-draw-route');
    drawBtn.textContent = 'Route Drawn ✓';
    drawBtn.style.borderColor = '#00c896';
    drawBtn.style.color = '#00c896';
    drawBtn.style.background = 'rgba(0,200,150,0.08)';

    console.log(`[RoadWorkRoute] Drew route: ${distanceKm} km, intensity: ${intensity}`);
  },

  _clearRoute() {
    if (this.routeLine) { this.map.removeLayer(this.routeLine); this.routeLine = null; }
    if (this.routeOverlay) { this.map.removeLayer(this.routeOverlay); this.routeOverlay = null; }
    if (this.startMarker) { this.map.removeLayer(this.startMarker); this.startMarker = null; }
    if (this.endMarker) { this.map.removeLayer(this.endMarker); this.endMarker = null; }

    this.startPoint = null;
    this.endPoint = null;
    this.selectingPoint = null;

    // Reset start button
    const startBtn = document.getElementById('btn-rw-start');
    startBtn.classList.remove('rw-set', 'rw-selecting');
    startBtn.innerHTML = '<span class="rw-point-dot rw-start-dot"></span> Set Start Point';

    // Reset end button
    const endBtn = document.getElementById('btn-rw-end');
    endBtn.classList.remove('rw-set', 'rw-selecting');
    endBtn.innerHTML = '<span class="rw-point-dot rw-end-dot"></span> Set End Point';

    // Reset statuses
    const startStatus = document.getElementById('rw-start-status');
    startStatus.textContent = 'Not set';
    startStatus.classList.remove('rw-status-set');

    const endStatus = document.getElementById('rw-end-status');
    endStatus.textContent = 'Not set';
    endStatus.classList.remove('rw-status-set');

    // Reset draw button
    const drawBtn = document.getElementById('btn-rw-draw-route');
    drawBtn.disabled = true;
    drawBtn.textContent = 'Draw Road Work Route';
    drawBtn.style.borderColor = '';
    drawBtn.style.color = '';
    drawBtn.style.background = '';

    // Hide clear button
    document.getElementById('btn-rw-clear-route').style.display = 'none';
    this.map.getContainer().style.cursor = '';

    console.log('[RoadWorkRoute] Cleared route');
  },

  _generateRoutePoints(start, end) {
    const points = [start];
    const steps = 5;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const lat = start.lat + (end.lat - start.lat) * t + (Math.random() - 0.5) * 0.003;
      const lng = start.lng + (end.lng - start.lng) * t + (Math.random() - 0.5) * 0.003;
      points.push(L.latLng(lat, lng));
    }
    points.push(end);
    return points;
  },

  _calculateDistance(p1, p2) {
    const R = 6371;
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
};

window.RoadWorkRoute = RoadWorkRoute;
