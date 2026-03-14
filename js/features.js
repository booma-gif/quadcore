// features.js
// Traffic Regions, Bus Routes, Infrastructure Placement, Simulation Overlay, Metric Aggregation

/* ═══════════════════════════════════════
   CONSTANTS & CONFIGURATION
   ═══════════════════════════════════════ */

const trafficLevels = {
  low:      { vehicles: 80,  color: '#22c55e', fillColor: 'rgba(34,197,94,0.25)',  travelTime: -10, co2: -8,  energy: -5, dotCount: 5,  dotSpeed: 0.3 },
  medium:   { vehicles: 180, color: '#eab308', fillColor: 'rgba(234,179,8,0.25)',  travelTime: +5,  co2: +5,  energy: +3, dotCount: 12, dotSpeed: 0.7 },
  high:     { vehicles: 340, color: '#ef4444', fillColor: 'rgba(239,68,68,0.25)',  travelTime: +20, co2: +18, energy: +12, dotCount: 25, dotSpeed: 1.2 },
  critical: { vehicles: 520, color: '#7c3aed', fillColor: 'rgba(139,92,246,0.25)', travelTime: +40, co2: +32, energy: +22, dotCount: 40, dotSpeed: 1.8 }
};

const busImpacts = {
  standard: { travelTime: -12, co2: -8,  energy: 0,  accessibility: +15, cost: +400000 },
  electric: { travelTime: -12, co2: -18, energy: -5, accessibility: +15, cost: +700000 },
  minibus:  { travelTime: -8,  co2: -5,  energy: 0,  accessibility: +10, cost: +200000 }
};

const frequencyMultipliers = {
  '5':  1.5,
  '10': 1.0,
  '20': 0.7,
  '30': 0.5
};

const busRouteColors = ['#7c3aed','#06b6d4','#a78bfa','#8b5cf6','#0ea5e9','#6d28d9','#0891b2'];

const infraTypes = {
  buildings: [
    { key: 'officeTower',      emoji: '🏢', name: 'Office Tower',       impact: { accessibility: +5,  energy: +8,  co2: +5,  cost: +3000000 }},
    { key: 'hospital',         emoji: '🏥', name: 'Hospital',           impact: { accessibility: +12, energy: +6,  cost: +5000000 }},
    { key: 'school',           emoji: '🏫', name: 'School',             impact: { accessibility: +10, cost: +2000000 }},
    { key: 'hotel',            emoji: '🏨', name: 'Hotel',              impact: { co2: +3,  energy: +4,  cost: +4000000 }},
    { key: 'shoppingMall',     emoji: '🏪', name: 'Shopping Mall',      impact: { travelTime: +8, co2: +8, cost: +6000000 }},
    { key: 'factory',          emoji: '🏭', name: 'Factory',            impact: { co2: +15, energy: +12, travelTime: +5, cost: +8000000 }},
    { key: 'residentialBlock', emoji: '🏠', name: 'Residential Block',  impact: { accessibility: +6, cost: +2500000 }},
    { key: 'govBuilding',      emoji: '🏛️', name: 'Government Building',impact: { accessibility: +8, cost: +4000000 }}
  ],
  transport: [
    { key: 'metroStation', emoji: '🚉', name: 'Metro Station',      impact: { travelTime: -20, co2: -12, accessibility: +25, cost: +15000000 }},
    { key: 'tramStop',     emoji: '🚊', name: 'Tram Stop',          impact: { travelTime: -10, co2: -6,  accessibility: +15, cost: +3000000 }},
    { key: 'airport',      emoji: '✈️', name: 'Airport Terminal',    impact: { travelTime: +10, co2: +20, energy: +15, cost: +50000000 }},
    { key: 'parking',      emoji: '🅿️', name: 'Parking Structure',  impact: { travelTime: -5,  co2: +5,  cost: +2000000 }},
    { key: 'bridge',       emoji: '🌉', name: 'Bridge',             impact: { travelTime: -15, cost: +20000000 }},
    { key: 'highway',      emoji: '🛣️', name: 'Highway Interchange',impact: { travelTime: -10, co2: +10, cost: +30000000 }}
  ],
  green: [
    { key: 'cityPark',     emoji: '🌳', name: 'City Park',         impact: { co2: -10, accessibility: +8,  cost: +1000000 }},
    { key: 'greenCorridor',emoji: '🌿', name: 'Green Corridor',    impact: { co2: -8,  accessibility: +6,  cost: +500000 }},
    { key: 'publicSquare', emoji: '⛲', name: 'Public Square',     impact: { accessibility: +7, cost: +800000 }},
    { key: 'urbanFarm',    emoji: '🌾', name: 'Urban Farm',        impact: { co2: -6,  accessibility: +4,  cost: +600000 }},
    { key: 'recreation',   emoji: '🏊', name: 'Recreation Center', impact: { accessibility: +9, cost: +3000000 }}
  ],
  utilities: [
    { key: 'powerPlant',    emoji: '⚡', name: 'Power Plant',      impact: { energy: +20, co2: +15, cost: +25000000 }},
    { key: 'solarFarm',     emoji: '☀️', name: 'Solar Farm',       impact: { energy: +15, co2: -20, cost: +10000000 }},
    { key: 'water',         emoji: '💧', name: 'Water Treatment',  impact: { accessibility: +5, cost: +5000000 }},
    { key: 'telecom',       emoji: '📡', name: 'Telecom Tower',    impact: { accessibility: +3, cost: +1000000 }},
    { key: 'recycling',     emoji: '♻️', name: 'Recycling Center', impact: { co2: -5,  cost: +2000000 }},
    { key: 'energyStorage', emoji: '🔋', name: 'Energy Storage',   impact: { energy: -8, cost: +8000000 }}
  ]
};

/* ═══════════════════════════════════════
   TRAFFIC REGION MANAGER
   ═══════════════════════════════════════ */

// ─── SMOOTH TRAFFIC ANIMATION ENGINE ──────────────

var trafficRegionsVisible = true;
var activeAnimations = new Map();

function animateTrafficZone(zone, level) {
  stopZoneAnimation(zone);

  var cycleDuration = { critical: 600, high: 1200, medium: 2400, low: 4000 };
  var opacityConfig = {
    critical: { max: 0.80, min: 0.15 },
    high:     { max: 0.70, min: 0.18 },
    medium:   { max: 0.60, min: 0.20 },
    low:      { max: 0.50, min: 0.18 }
  };

  var duration = cycleDuration[level] || 2400;
  var opConfig = opacityConfig[level] || opacityConfig.medium;
  var startTime = null;
  var animationId = null;
  var isRunning = true;

  function tick(timestamp) {
    if (!isRunning) return;
    if (!TrafficRegionManager.layerGroup || !TrafficRegionManager.layerGroup.hasLayer(zone)) {
      stopZoneAnimation(zone);
      return;
    }
    if (!startTime) startTime = timestamp;
    var elapsed = timestamp - startTime;
    var progress = elapsed / duration;
    var sineValue = Math.sin(progress * Math.PI * 2);
    var opRange = opConfig.max - opConfig.min;
    var opacity = opConfig.min + (opRange * ((sineValue + 1) / 2));
    try {
      zone.setStyle({ fillOpacity: opacity, opacity: Math.min(opacity + 0.15, 1) });
    } catch(e) {
      stopZoneAnimation(zone);
      return;
    }
    animationId = requestAnimationFrame(tick);
  }

  animationId = requestAnimationFrame(tick);

  activeAnimations.set(zone, {
    stop: function() {
      isRunning = false;
      if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
    }
  });
}

function stopZoneAnimation(zone) {
  if (activeAnimations.has(zone)) {
    activeAnimations.get(zone).stop();
    activeAnimations.delete(zone);
  }
}

function stopAllZoneAnimations() {
  activeAnimations.forEach(function(anim) { anim.stop(); });
  activeAnimations.clear();
}

// ─── END ANIMATION ENGINE ──────────────────────────

const TrafficRegionManager = {
  regions: [],
  drawingMode: false,
  tempRect: null,
  tempStart: null,
  canvas: null,
  ctx: null,
  dots: [],
  animFrameId: null,

  init(map) {
    this.map = map;
    this.layerGroup = L.layerGroup().addTo(map);
    this._initCanvas();
    this._startDotAnimation();
    this._initHideButton();
    console.log('[TrafficRegionManager] Initialized');
  },

  _initCanvas() {
    const mapContainer = this.map.getContainer();
    let canvas = mapContainer.querySelector('#traffic-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'traffic-canvas';
      mapContainer.appendChild(canvas);
    }
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this._resizeCanvas();
    this.map.on('move zoom resize', () => this._resizeCanvas());
    window.addEventListener('resize', () => this._resizeCanvas());
  },

  _resizeCanvas() {
    if (!this.canvas) return;
    const container = this.map.getContainer();
    this.canvas.width = container.offsetWidth;
    this.canvas.height = container.offsetHeight;
  },

  showTrafficRegions() {
    // Clear existing zones first
    this.clearAll();

    // Get current map bounds
    const bounds = this.map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const latRange = ne.lat - sw.lat;
    const lngRange = ne.lng - sw.lng;

    // Random zone count between 8 and 12
    const zoneCount = Math.floor(Math.random() * 5) + 8;
    const levels = ['low', 'medium', 'high', 'critical'];

    for (let i = 0; i < zoneCount; i++) {
      const level = levels[Math.floor(Math.random() * levels.length)];
      const config = trafficLevels[level];

      // Random center within map bounds (10% padding from edges)
      const lat = sw.lat + latRange * (0.1 + Math.random() * 0.8);
      const lng = sw.lng + lngRange * (0.1 + Math.random() * 0.8);
      const center = L.latLng(lat, lng);

      // Choose circle or polygon randomly
      const useCircle = Math.random() > 0.45;
      let zone;

      if (useCircle) {
        const radius = 400 + Math.random() * 800;
        zone = L.circle(center, {
          radius: radius,
          color: config.color,
          fillColor: config.fillColor,
          fillOpacity: 1,
          weight: 2,
          opacity: 0.7,
          interactive: true
        });
      } else {
        const sides = Math.floor(3 + Math.random() * 4);
        const baseRadius = (300 + Math.random() * 700) / 111320;
        const points = [];
        for (let s = 0; s < sides; s++) {
          const angle = (s / sides) * 2 * Math.PI;
          const r = baseRadius * (0.6 + Math.random() * 0.8);
          const pLat = lat + r * Math.cos(angle);
          const pLng = lng + r * Math.sin(angle) / Math.cos(lat * Math.PI / 180);
          points.push([pLat, pLng]);
        }
        zone = L.polygon(points, {
          color: config.color,
          fillColor: config.fillColor,
          fillOpacity: 1,
          weight: 2,
          opacity: 0.7,
          interactive: true
        });
      }

      // Popup with traffic info
      zone.bindPopup(
        '<div style="min-width:160px">' +
        '<b style="color:' + config.color + '">🚦 Traffic Zone</b><br>' +
        '<hr style="border-color:#1a2e22;margin:5px 0">' +
        'Level: <b style="color:' + config.color + '">' + level.charAt(0).toUpperCase() + level.slice(1) + '</b><br>' +
        'Vehicles: <b>' + config.vehicles + '/hr</b><br>' +
        'Travel time: <b>' + (config.travelTime > 0 ? '+' : '') + config.travelTime + ' min</b>' +
        '</div>'
      );

      zone.addTo(this.layerGroup);

      // Create center label
      const labelCenter = useCircle ? center : zone.getBounds().getCenter();
      const label = L.divIcon({
        className: '',
        html: `<div class="traffic-label" style="border-color:${config.color}">
          <span style="color:${config.color}">● ${level.charAt(0).toUpperCase()+level.slice(1)} Traffic</span> — ${config.vehicles} vehicles/hr
        </div>`,
        iconSize: [180, 30], iconAnchor: [90, 15]
      });
      const labelMarker = L.marker(labelCenter, { icon: label, interactive: false }).addTo(this.layerGroup);

      // Create bounds for dot animation
      const zoneBounds = zone.getBounds();
      const regionId = Date.now() + i + Math.random();
      const region = { id: regionId, level, bounds: zoneBounds, rect: zone, labelMarker, config };
      this.regions.push(region);

      // Generate dots for animation
      this._generateDotsForRegion(region);

      // Staggered smooth animation start
      zone.setStyle({ fillOpacity: 0, opacity: 0 });
      setTimeout(function(z, lvl) {
        return function() { animateTrafficZone(z, lvl); };
      }(zone, level), 50 + (i * 30));
    }

    // Update sidebar list
    this._updateList();
    MetricAggregator.recalculate();

    // Show hide button reliably
    var hideBtn = document.getElementById('btn-hide-traffic-regions');
    if (hideBtn) {
      hideBtn.style.display = 'block';
      hideBtn.textContent = 'Hide Traffic Regions';
      hideBtn.style.color = '';
      hideBtn.style.borderColor = '';
      hideBtn.style.background = '';
    }
    trafficRegionsVisible = true;

    console.log(`[TrafficRegion] Auto-generated ${zoneCount} zones`);
  },

  clearAll() {
    // Stop all smooth animations
    stopAllZoneAnimations();
    this.layerGroup.clearLayers();
    this.dots = [];
    this.regions = [];
    this._updateList();

    // Hide the hide button
    var hideBtn = document.getElementById('btn-hide-traffic-regions');
    if (hideBtn) {
      hideBtn.style.display = 'none';
    }
    trafficRegionsVisible = true;
  },

  _generateDotsForRegion(region) {
    const b = region.bounds;
    const config = region.config;
    for (let i = 0; i < config.dotCount; i++) {
      this.dots.push({
        regionId: region.id,
        x: b.getWest() + Math.random() * (b.getEast() - b.getWest()),
        y: b.getSouth() + Math.random() * (b.getNorth() - b.getSouth()),
        vx: (Math.random() - 0.5) * config.dotSpeed * 0.001,
        vy: (Math.random() - 0.5) * config.dotSpeed * 0.001,
        color: config.color,
        bounds: b
      });
    }
  },

  _startDotAnimation() {
    const animate = () => {
      this.animFrameId = requestAnimationFrame(animate);
      if (!this.ctx || !this.canvas) return;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      this.dots.forEach(dot => {
        dot.x += dot.vx;
        dot.y += dot.vy;
        // Bounce within bounds
        if (dot.x < dot.bounds.getWest() || dot.x > dot.bounds.getEast()) dot.vx *= -1;
        if (dot.y < dot.bounds.getSouth() || dot.y > dot.bounds.getNorth()) dot.vy *= -1;
        // Clamp
        dot.x = Math.max(dot.bounds.getWest(), Math.min(dot.bounds.getEast(), dot.x));
        dot.y = Math.max(dot.bounds.getSouth(), Math.min(dot.bounds.getNorth(), dot.y));
        
        const pt = this.map.latLngToContainerPoint([dot.y, dot.x]);
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        this.ctx.fillStyle = dot.color;
        this.ctx.globalAlpha = 0.8;
        this.ctx.fill();
      });
      this.ctx.globalAlpha = 1;
    };
    animate();
  },

  removeRegion(id) {
    const idx = this.regions.findIndex(r => r.id === id);
    if (idx === -1) return;
    const region = this.regions[idx];
    this.layerGroup.removeLayer(region.rect);
    this.layerGroup.removeLayer(region.labelMarker);
    this.dots = this.dots.filter(d => d.regionId !== id);
    this.regions.splice(idx, 1);
    this._updateList();
    MetricAggregator.recalculate();
    console.log(`[TrafficRegion] Removed region, remaining: ${this.regions.length}`);
  },

  _updateList() {
    const container = document.getElementById('traffic-regions-list');
    if (!container) return;
    if (this.regions.length === 0) {
      container.innerHTML = '<div style="color:var(--text-secondary);font-size:0.8rem;padding:5px 0;">No regions drawn yet</div>';
      return;
    }
    container.innerHTML = this.regions.map(r => `
      <div class="active-item">
        <div class="dot" style="background:${r.config.color}"></div>
        <span class="item-label">${r.level.charAt(0).toUpperCase()+r.level.slice(1)} — ${r.config.vehicles} veh/hr</span>
        <button class="remove-btn" onclick="TrafficRegionManager.removeRegion(${r.id})">✕</button>
      </div>
    `).join('');
  },

  _showInstruction(text) {
    this._removeInstruction();
    const mapEl = this.map.getContainer();
    const div = document.createElement('div');
    div.className = 'map-instruction';
    div.id = 'map-instruction';
    div.textContent = text;
    mapEl.appendChild(div);
  },

  _removeInstruction() {
    const el = document.getElementById('map-instruction');
    if (el) el.remove();
  },

  _initHideButton() {
    var self = this;
    // Use event delegation so it works regardless of button existence timing
    document.body.addEventListener('click', function(e) {
      if (e.target.id !== 'btn-hide-traffic-regions') return;

      if (trafficRegionsVisible) {
        // HIDE — stop animations and remove from map view
        self.regions.forEach(function(r) {
          stopZoneAnimation(r.rect);
          if (r.rect && self.layerGroup.hasLayer(r.rect)) {
            self.layerGroup.removeLayer(r.rect);
          }
          if (r.labelMarker && self.layerGroup.hasLayer(r.labelMarker)) {
            self.layerGroup.removeLayer(r.labelMarker);
          }
        });
        self.dots = [];

        e.target.textContent = 'Restore Traffic Regions';
        e.target.style.color = '#00c896';
        e.target.style.borderColor = 'rgba(0, 200, 150, 0.4)';
        e.target.style.background = 'rgba(0, 200, 150, 0.06)';
        trafficRegionsVisible = false;

      } else {
        // RESTORE — add back and restart animations
        self.regions.forEach(function(r) {
          if (r.rect) r.rect.addTo(self.layerGroup);
          if (r.labelMarker) r.labelMarker.addTo(self.layerGroup);
          self._generateDotsForRegion(r);
          setTimeout(function() {
            animateTrafficZone(r.rect, r.level);
          }, 80);
        });

        e.target.textContent = 'Hide Traffic Regions';
        e.target.style.color = '';
        e.target.style.borderColor = '';
        e.target.style.background = '';
        trafficRegionsVisible = true;
      }
    });
  },

  getImpact() {
    let impact = { travelTime: 0, co2: 0, energy: 0, accessibility: 0, cost: 0, congestion: 0, housing: 0, roadHealth: 0 };
    this.regions.forEach(r => {
      impact.travelTime += r.config.travelTime;
      impact.co2 += r.config.co2;
      impact.energy += r.config.energy;
      // Traffic regions affect congestion and road health
      impact.congestion += (r.config.travelTime > 0 ? r.config.travelTime * 0.8 : r.config.travelTime * 0.5);
      impact.roadHealth += (r.config.travelTime > 0 ? -r.config.travelTime * 0.3 : r.config.travelTime * 0.2);
    });
    return impact;
  },

  getDataForSave() {
    return this.regions.map(r => ({
      level: r.level,
      bounds: { south: r.bounds.getSouth(), west: r.bounds.getWest(), north: r.bounds.getNorth(), east: r.bounds.getEast() },
      vehicles: r.config.vehicles,
      impact: { travelTime: r.config.travelTime, co2: r.config.co2, energy: r.config.energy }
    }));
  }
};


/* ═══════════════════════════════════════
   BUS ROUTE MANAGER
   ═══════════════════════════════════════ */

const BusRouteManager = {
  routes: [],
  drawingMode: false,
  currentPoints: [],
  currentMarkers: [],
  currentPolyline: null,
  colorIndex: 0,

  init(map) {
    this.map = map;
    this.layerGroup = L.layerGroup().addTo(map);
    console.log('[BusRouteManager] Initialized');
  },

  startDrawing() {
    this.drawingMode = true;
    this.currentPoints = [];
    this.currentMarkers = [];
    this.currentPolyline = null;
    this.map.getContainer().style.cursor = 'crosshair';
    this._showInstruction('Click points on the map to draw your bus route. Double-click to finish.');

    this._clickHandler = (e) => {
      if (!this.drawingMode) return;
      L.DomEvent.stopPropagation(e);
      const latlng = e.latlng;
      this.currentPoints.push(latlng);

      // Place bus stop marker
      const stopMarker = L.marker(latlng, {
        icon: L.divIcon({ html: '<div class="bus-stop-marker">🚏</div>', iconSize: [24, 24], className: '' })
      }).addTo(this.layerGroup);
      this.currentMarkers.push(stopMarker);

      // Update or create polyline
      if (this.currentPolyline) {
        this.currentPolyline.setLatLngs(this.currentPoints);
      } else if (this.currentPoints.length >= 2) {
        this.currentPolyline = L.polyline(this.currentPoints, {
          color: '#7c3aed', weight: 4, opacity: 0.9, dashArray: '10, 6', className: 'bus-route-drawing'
        }).addTo(this.layerGroup);
      }
    };

    this._dblClickHandler = (e) => {
      if (!this.drawingMode || this.currentPoints.length < 2) return;
      L.DomEvent.stopPropagation(e);
      L.DomEvent.preventDefault(e);
      this.drawingMode = false;
      this.map.getContainer().style.cursor = '';
      this._removeInstruction();
      this.map.off('click', this._clickHandler);
      this.map.off('dblclick', this._dblClickHandler);
      this._showRoutePopup();
    };

    this.map.on('click', this._clickHandler);
    this.map.on('dblclick', this._dblClickHandler);
  },

  _showInstruction(text) {
    TrafficRegionManager._showInstruction.call({ map: this.map, _removeInstruction: TrafficRegionManager._removeInstruction }, text);
  },

  _removeInstruction() {
    TrafficRegionManager._removeInstruction();
  },

  _showRoutePopup() {
    const center = this.currentPoints[Math.floor(this.currentPoints.length / 2)];
    const popup = L.popup({ closeOnClick: false, autoClose: false, maxWidth: 350 })
      .setLatLng(center)
      .setContent(`
        <div class="route-popup">
          <h4>🚌 Save Bus Route</h4>
          <div class="input-group">
            <label>Route Name</label>
            <input type="text" id="route-name-input" placeholder="e.g. Route B7 — Downtown Loop" value="Route ${this.routes.length + 1}">
          </div>
          <div class="input-group">
            <label>Bus Frequency</label>
            <select id="route-freq-input">
              <option value="5">Every 5 mins</option>
              <option value="10" selected>Every 10 mins</option>
              <option value="20">Every 20 mins</option>
              <option value="30">Every 30 mins</option>
            </select>
          </div>
          <div class="input-group">
            <label>Bus Type</label>
            <select id="route-type-input">
              <option value="standard">🚌 Standard Bus</option>
              <option value="electric">⚡ Electric Bus</option>
              <option value="minibus">🚎 Minibus</option>
            </select>
          </div>
          <div class="btn-row">
            <button class="btn-save" onclick="BusRouteManager._saveRoute()">Save Route</button>
            <button class="btn-cancel" onclick="BusRouteManager._cancelRoute()">Cancel</button>
          </div>
        </div>
      `)
      .openOn(this.map);
    this._pendingPopup = popup;
  },

  _saveRoute() {
    const name = document.getElementById('route-name-input')?.value || `Route ${this.routes.length + 1}`;
    const frequency = document.getElementById('route-freq-input')?.value || '10';
    const busType = document.getElementById('route-type-input')?.value || 'standard';

    if (this._pendingPopup) this.map.closePopup(this._pendingPopup);

    // Finalize polyline — solid color based on bus type
    if (this.currentPolyline) this.layerGroup.removeLayer(this.currentPolyline);
    const colorMap = { standard: '#7c3aed', electric: '#06b6d4', minibus: '#a78bfa' };
    const routeColor = colorMap[busType] || busRouteColors[this.colorIndex % busRouteColors.length];
    this.colorIndex++;

    const finalLine = L.polyline(this.currentPoints, {
      color: routeColor, weight: 4, opacity: 0.9
    }).addTo(this.layerGroup);

    // Route label at midpoint
    const midIdx = Math.floor(this.currentPoints.length / 2);
    const midPoint = this.currentPoints[midIdx];
    const routeLabel = L.marker(midPoint, {
      icon: L.divIcon({ html: `<div class="route-label">${name}</div>`, className: '', iconSize: [120, 20], iconAnchor: [60, 10] }),
      interactive: false
    }).addTo(this.layerGroup);

    // Animated bus icon
    const busEmoji = busType === 'electric' ? '⚡🚌' : '🚌';
    const busMarker = L.marker(this.currentPoints[0], {
      icon: L.divIcon({ html: `<div class="bus-icon-marker">${busEmoji}</div>`, className: '', iconSize: [24, 24], iconAnchor: [12, 12] }),
      interactive: false
    }).addTo(this.layerGroup);

    const routeId = Date.now() + Math.random();
    const route = {
      id: routeId, name, busType, frequency,
      waypoints: this.currentPoints.map(p => [p.lat, p.lng]),
      polyline: finalLine, label: routeLabel, busMarker,
      stopMarkers: [...this.currentMarkers],
      color: routeColor
    };
    this.routes.push(route);

    // Start bus animation
    this._animateBus(route);

    // Cleanup
    this.currentPoints = [];
    this.currentMarkers = [];
    this.currentPolyline = null;
    this._updateList();
    MetricAggregator.recalculate();
    console.log(`[BusRoute] Saved "${name}" (${busType}, every ${frequency}min), total routes: ${this.routes.length}`);
  },

  _cancelRoute() {
    if (this._pendingPopup) this.map.closePopup(this._pendingPopup);
    // Remove temp markers and polyline
    this.currentMarkers.forEach(m => this.layerGroup.removeLayer(m));
    if (this.currentPolyline) this.layerGroup.removeLayer(this.currentPolyline);
    this.currentPoints = [];
    this.currentMarkers = [];
    this.currentPolyline = null;
    this.drawingMode = false;
    this.map.getContainer().style.cursor = '';
    this._removeInstruction();
    this.map.off('click', this._clickHandler);
    this.map.off('dblclick', this._dblClickHandler);
  },

  _animateBus(route) {
    const points = route.waypoints;
    let idx = 0;
    let forward = true;
    const speed = route.frequency === '5' ? 80 : route.frequency === '10' ? 120 : route.frequency === '20' ? 200 : 300;

    const step = () => {
      if (!this.routes.find(r => r.id === route.id)) return; // Route removed
      route.busMarker.setLatLng(points[idx]);
      if (forward) { idx++; if (idx >= points.length) { forward = false; idx = points.length - 2; } }
      else { idx--; if (idx < 0) { forward = true; idx = 1; } }
      if (idx < 0) idx = 0;
      if (idx >= points.length) idx = points.length - 1;
      route._animTimer = setTimeout(step, speed);
    };
    step();
  },

  removeRoute(id) {
    const idx = this.routes.findIndex(r => r.id === id);
    if (idx === -1) return;
    const route = this.routes[idx];
    if (route._animTimer) clearTimeout(route._animTimer);
    this.layerGroup.removeLayer(route.polyline);
    this.layerGroup.removeLayer(route.label);
    this.layerGroup.removeLayer(route.busMarker);
    route.stopMarkers.forEach(m => this.layerGroup.removeLayer(m));
    this.routes.splice(idx, 1);
    this._updateList();
    MetricAggregator.recalculate();
    console.log(`[BusRoute] Removed route, remaining: ${this.routes.length}`);
  },

  _updateList() {
    const container = document.getElementById('bus-routes-list');
    if (!container) return;
    if (this.routes.length === 0) {
      container.innerHTML = '<div style="color:var(--text-secondary);font-size:0.8rem;padding:5px 0;">No routes drawn yet</div>';
      return;
    }
    container.innerHTML = this.routes.map(r => `
      <div class="active-item">
        <div class="dot" style="background:${r.color}"></div>
        <span class="item-label">${r.name} (${r.busType})</span>
        <button class="remove-btn" onclick="BusRouteManager.removeRoute(${r.id})">✕</button>
      </div>
    `).join('');
  },

  getImpact() {
    let impact = { travelTime: 0, co2: 0, energy: 0, accessibility: 0, cost: 0, congestion: 0, housing: 0, roadHealth: 0 };
    this.routes.forEach(r => {
      const base = busImpacts[r.busType] || busImpacts.standard;
      const freq = frequencyMultipliers[r.frequency] || 1.0;
      Object.keys(base).forEach(k => { if (impact[k] !== undefined) impact[k] += base[k] * freq; });
      // Bus routes reduce congestion and slightly improve housing accessibility
      impact.congestion += -8 * freq;
      impact.housing += 3 * freq;
    });
    return impact;
  },

  getDataForSave() {
    return this.routes.map(r => ({
      name: r.name, type: r.busType, frequency: r.frequency,
      waypoints: r.waypoints,
      impact: (() => {
        const base = busImpacts[r.busType] || busImpacts.standard;
        const freq = frequencyMultipliers[r.frequency] || 1.0;
        const imp = {};
        Object.keys(base).forEach(k => { imp[k] = base[k] * freq; });
        return imp;
      })()
    }));
  }
};


/* ═══════════════════════════════════════
   INFRASTRUCTURE MANAGER
   ═══════════════════════════════════════ */

const InfrastructureManager = {
  placed: [],
  placingMode: false,
  selectedType: null,
  pickerVisible: false,

  init(map) {
    this.map = map;
    this.layerGroup = L.layerGroup().addTo(map);
    console.log('[InfrastructureManager] Initialized');
  },

  showPicker() {
    const existing = document.getElementById('infra-picker-panel');
    if (existing) { existing.remove(); this.pickerVisible = false; return; }
    this.pickerVisible = true;
    const allTypes = Object.values(infraTypes).flat();
    const categories = Object.keys(infraTypes);
    
    const mapEl = this.map.getContainer();
    const panel = document.createElement('div');
    panel.className = 'infra-picker';
    panel.id = 'infra-picker-panel';

    panel.innerHTML = `
      <div class="tab-row">
        ${categories.map((c, i) => `<button class="${i===0?'active':''}" onclick="InfrastructureManager._switchTab('${c}', this)">${c.charAt(0).toUpperCase()+c.slice(1)}</button>`).join('')}
      </div>
      ${categories.map((c, i) => `
        <div class="icon-grid infra-tab-content" id="infra-tab-${c}" style="${i>0?'display:none':''}">
          ${infraTypes[c].map(t => `
            <button onclick="InfrastructureManager._selectType('${t.key}')">
              <span class="emoji">${t.emoji}</span>
              ${t.name}
            </button>
          `).join('')}
        </div>
      `).join('')}
    `;
    mapEl.appendChild(panel);
  },

  _switchTab(category, btn) {
    const panel = document.getElementById('infra-picker-panel');
    if (!panel) return;
    panel.querySelectorAll('.tab-row button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    panel.querySelectorAll('.infra-tab-content').forEach(c => c.style.display = 'none');
    const target = document.getElementById(`infra-tab-${category}`);
    if (target) target.style.display = 'grid';
  },

  _selectType(key) {
    const allTypes = Object.values(infraTypes).flat();
    const typeData = allTypes.find(t => t.key === key);
    if (!typeData) return;
    this.selectedType = typeData;
    this.placingMode = true;

    // Remove picker, show placing bar
    const picker = document.getElementById('infra-picker-panel');
    if (picker) picker.remove();
    this.pickerVisible = false;

    const mapEl = this.map.getContainer();
    const bar = document.createElement('div');
    bar.className = 'infra-placing-bar';
    bar.id = 'infra-placing-bar';
    bar.innerHTML = `Placing: ${typeData.emoji} ${typeData.name} — Click map
      <button class="cancel-btn" onclick="InfrastructureManager._cancelPlacing()">Cancel</button>`;
    mapEl.appendChild(bar);

    this.map.getContainer().style.cursor = 'crosshair';
    this._placeHandler = (e) => {
      if (!this.placingMode) return;
      this._placeInfra(e.latlng, this.selectedType);
    };
    this.map.on('click', this._placeHandler);
  },

  _placeInfra(latlng, typeData) {
    const marker = L.marker(latlng, {
      icon: L.divIcon({
        html: `<div class="infra-marker">${typeData.emoji}</div>`,
        iconSize: [40, 40], className: ''
      })
    }).addTo(this.layerGroup);

    // Build impact tooltip
    const impactStr = Object.entries(typeData.impact)
      .filter(([k,v]) => k !== 'cost')
      .map(([k,v]) => `${k} ${v>0?'+':''}${v}%`)
      .join(', ');
    const costStr = typeData.impact.cost ? `$${(typeData.impact.cost/1000000).toFixed(1)}M` : '';

    marker.bindTooltip(`${typeData.emoji} ${typeData.name}${impactStr ? ' — '+impactStr : ''}${costStr ? ' | Cost '+costStr : ''}`, {
      direction: 'top', offset: [0, -20],
      className: 'route-label'
    });

    const infraId = Date.now() + Math.random();
    marker.on('click', () => {
      L.popup({ maxWidth: 200 })
        .setLatLng(latlng)
        .setContent(`<div style="text-align:center;padding:8px;">
          <div style="font-size:0.9rem;margin-bottom:8px;">Remove ${typeData.emoji} ${typeData.name}?</div>
          <button style="background:#ef4444;border:none;color:white;padding:5px 15px;border-radius:6px;cursor:pointer;font-weight:600;" onclick="InfrastructureManager.removeInfra(${infraId})">Remove</button>
        </div>`)
        .openOn(this.map);
    });

    this.placed.push({ id: infraId, type: typeData.key, emoji: typeData.emoji, name: typeData.name, latlng: [latlng.lat, latlng.lng], impact: typeData.impact, marker });
    this._updateList();
    MetricAggregator.recalculate();
    console.log(`[Infrastructure] Placed ${typeData.name}, total: ${this.placed.length}`);
  },

  _cancelPlacing() {
    this.placingMode = false;
    this.selectedType = null;
    this.map.getContainer().style.cursor = '';
    this.map.off('click', this._placeHandler);
    const bar = document.getElementById('infra-placing-bar');
    if (bar) bar.remove();
  },

  removeInfra(id) {
    const idx = this.placed.findIndex(p => p.id === id);
    if (idx === -1) return;
    const infra = this.placed[idx];
    this.layerGroup.removeLayer(infra.marker);
    this.placed.splice(idx, 1);
    this.map.closePopup();
    this._updateList();
    MetricAggregator.recalculate();
    console.log(`[Infrastructure] Removed ${infra.name}, remaining: ${this.placed.length}`);
  },

  _updateList() {
    const container = document.getElementById('infra-placed-list');
    if (!container) return;
    if (this.placed.length === 0) {
      container.innerHTML = '<div style="color:var(--text-secondary);font-size:0.8rem;padding:5px 0;">No infrastructure placed yet</div>';
      return;
    }
    // Group by category
    const groups = {};
    const allTypes = Object.entries(infraTypes);
    this.placed.forEach(p => {
      let cat = 'other';
      allTypes.forEach(([catName, items]) => { if (items.find(i => i.key === p.type)) cat = catName; });
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    let html = '';
    Object.entries(groups).forEach(([cat, items]) => {
      html += `<div style="font-size:0.7rem;color:var(--text-secondary);text-transform:uppercase;margin:6px 0 3px;letter-spacing:0.5px;">${cat}</div>`;
      items.forEach(p => {
        html += `<div class="active-item">
          <span style="font-size:1rem;">${p.emoji}</span>
          <span class="item-label">${p.name}</span>
          <button class="remove-btn" onclick="InfrastructureManager.removeInfra(${p.id})">✕</button>
        </div>`;
      });
    });
    container.innerHTML = html;
  },

  getImpact() {
    let impact = { travelTime: 0, co2: 0, energy: 0, accessibility: 0, cost: 0, congestion: 0, housing: 0, roadHealth: 0 };
    this.placed.forEach(p => {
      Object.keys(p.impact).forEach(k => {
        if (impact[k] !== undefined) impact[k] += p.impact[k];
        else impact[k] = p.impact[k];
      });
      // Derive secondary metric impacts based on infrastructure category
      const allTypes = Object.entries(infraTypes);
      let cat = 'other';
      allTypes.forEach(([catName, items]) => { if (items.find(i => i.key === p.type)) cat = catName; });
      if (cat === 'transport') { impact.congestion -= 5; impact.roadHealth += 3; }
      if (cat === 'green') { impact.housing += 4; }
      if (cat === 'buildings') { impact.housing += 2; impact.congestion += 2; }
    });
    return impact;
  },

  getDataForSave() {
    return this.placed.map(p => ({
      type: p.type, emoji: p.emoji, name: p.name, latlng: p.latlng, impact: p.impact
    }));
  }
};


/* ═══════════════════════════════════════
   METRIC AGGREGATOR
   ═══════════════════════════════════════ */

const MetricAggregator = {
  baseline: { travelTime: 28, co2: 340, energy: 2.4, accessibility: 67, cost: 2400000, congestion: 65, housing: 50, roadHealth: 60 },

  recalculate() {
    // Traffic zones are excluded from simulation - they represent existing baseline traffic
    const busImpact = BusRouteManager.getImpact();
    const infraImpact = InfrastructureManager.getImpact();
    const roadWorkImpact = (typeof RoadWorkManager !== 'undefined') ? RoadWorkManager.getImpact() : { travelTime: 0, co2: 0, energy: 0, accessibility: 0, cost: 0, congestion: 0, housing: 0, roadHealth: 0 };

    // Sum all deltas (traffic excluded)
    const totalDelta = {};
    ['travelTime','co2','energy','accessibility','cost','congestion','housing','roadHealth'].forEach(key => {
      totalDelta[key] = (busImpact[key]||0) + (infraImpact[key]||0) + (roadWorkImpact[key]||0);
    });

    // Apply percentage deltas to baseline
    const final = {};
    final.travelTime = this.baseline.travelTime * (1 + totalDelta.travelTime / 100);
    final.co2 = this.baseline.co2 * (1 + totalDelta.co2 / 100);
    final.energy = this.baseline.energy * (1 + totalDelta.energy / 100);
    final.accessibility = Math.min(100, Math.max(0, this.baseline.accessibility + totalDelta.accessibility));
    final.cost = this.baseline.cost + (totalDelta.cost || 0);
    final.congestion = Math.min(100, Math.max(0, this.baseline.congestion + totalDelta.congestion));
    final.housing = Math.min(100, Math.max(0, this.baseline.housing + totalDelta.housing));
    final.roadHealth = Math.min(100, Math.max(0, this.baseline.roadHealth + totalDelta.roadHealth));

    // Update live metric cards if they exist
    this._updateLiveCards(final);
    return { baseline: this.baseline, final, totalDelta };
  },

  _updateLiveCards(final) {
    const metricDefs = [
      { key: 'travelTime', label: 'Travel Time', unit: 'min', icon: '⏱️', lower: true },
      { key: 'co2', label: 'CO₂ Emissions', unit: 'tCO₂', icon: '☁️', lower: true },
      { key: 'energy', label: 'Energy', unit: 'GW', icon: '⚡', lower: true },
      { key: 'accessibility', label: 'Accessibility', unit: '%', icon: '♿', lower: false },
      { key: 'cost', label: 'Budget', unit: '$', icon: '💰', lower: true },
      { key: 'congestion', label: 'Congestion Score', unit: '/100', icon: '🚦', lower: true },
      { key: 'housing', label: 'Housing Affordability', unit: '/100', icon: '🏘️', lower: false },
      { key: 'roadHealth', label: 'Road Health', unit: '/100', icon: '🛣️', lower: false }
    ];

    const container = document.getElementById('kpi-container');
    if (!container || container.dataset.liveMode !== 'true') return;

    metricDefs.forEach(m => {
      const card = document.getElementById(`live-kpi-${m.key}`);
      if (!card) return;
      const base = this.baseline[m.key];
      const val = final[m.key];
      const diff = val - base;
      const pDiff = base !== 0 ? (diff / base) * 100 : 0;
      let isGood = m.lower ? diff < 0 : diff > 0;
      if (m.key === 'cost') isGood = false;

      let displayVal = m.key === 'cost' ? `$${(val/1000000).toFixed(1)}M` : val.toFixed(1);
      const sign = diff > 0 ? '+' : '';
      const colorClass = isGood ? 'positive' : (diff === 0 ? 'neutral' : 'negative');

      card.querySelector('.metric-value').innerHTML = `${displayVal} <span style="font-size:0.5em;color:var(--text-secondary)">${m.unit}</span>`;
      card.querySelector('.metric-change').className = `metric-change ${colorClass}`;
      card.querySelector('.metric-change').textContent = `${sign}${pDiff.toFixed(1)}% vs baseline`;
    });
  },

  buildLiveKPICards(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.dataset.liveMode = 'true';
    const metricDefs = [
      { key: 'travelTime', label: 'Travel Time', unit: 'min', icon: '⏱️' },
      { key: 'co2', label: 'CO₂ Emissions', unit: 'tCO₂', icon: '☁️' },
      { key: 'energy', label: 'Energy', unit: 'GW', icon: '⚡' },
      { key: 'accessibility', label: 'Accessibility', unit: '%', icon: '♿' },
      { key: 'cost', label: 'Budget', unit: '$', icon: '💰' },
      { key: 'congestion', label: 'Congestion Score', unit: '/100', icon: '🚦' },
      { key: 'housing', label: 'Housing Affordability', unit: '/100', icon: '🏘️' },
      { key: 'roadHealth', label: 'Road Health', unit: '/100', icon: '🛣️' }
    ];

    container.innerHTML = metricDefs.map(m => {
      const base = this.baseline[m.key];
      let displayVal = m.key === 'cost' ? `$${(base/1000000).toFixed(1)}M` : base.toFixed(1);
      return `<div class="kpi-card" id="live-kpi-${m.key}">
        <div class="metric-header">${m.icon} ${m.label}</div>
        <div class="metric-value">${displayVal} <span style="font-size:0.5em;color:var(--text-secondary)">${m.unit}</span></div>
        <span class="metric-change neutral">Baseline value</span>
      </div>`;
    }).join('');
  }
};


/* ═══════════════════════════════════════
   SIMULATION OVERLAY
   ═══════════════════════════════════════ */

const SimulationOverlay = {
  show(baseline, final, policyCount) {
    return new Promise((resolve) => {
      const overlay = document.getElementById('sim-overlay');
      if (!overlay) { resolve(); return; }

      const metricDefs = [
        { key: 'congestion', label: 'Congestion Score', unit: '/100', icon: '🚦', base: baseline.congestion, target: final.congestion },
        { key: 'travelTime', label: 'Travel Time', unit: 'min', icon: '⏱️', base: baseline.travelTime, target: final.travelTime },
        { key: 'energy', label: 'Energy', unit: 'GW', icon: '⚡', base: baseline.energy, target: final.energy },
        { key: 'co2', label: 'CO₂ Emissions', unit: 'tCO₂', icon: '🌿', base: baseline.co2, target: final.co2 },
        { key: 'accessibility', label: 'Accessibility', unit: '%', icon: '🚌', base: baseline.accessibility, target: final.accessibility },
        { key: 'housing', label: 'Housing Index', unit: '/100', icon: '🏘️', base: baseline.housing, target: final.housing },
        { key: 'cost', label: 'Budget', unit: '$M', icon: '💰', base: baseline.cost/1000000, target: final.cost/1000000 },
        { key: 'roadHealth', label: 'Road Health', unit: '/100', icon: '🛣️', base: baseline.roadHealth, target: final.roadHealth }
      ];

      // Build overlay content
      overlay.innerHTML = `
        <div>
          <div class="sim-title">⚙️ Running Simulation...</div>
          <div class="sim-subtitle">Analyzing ${policyCount} policies across NYC</div>
        </div>
        <div class="metrics-grid">
          ${metricDefs.map((m, i) => `
            <div class="metric-anim-card" id="sim-metric-${m.key}">
              <div class="metric-name">${m.icon} ${m.label}</div>
              <div class="metric-anim-value" id="sim-val-${m.key}">${m.base.toFixed(1)}</div>
              <div class="metric-arrow">→</div>
              <div class="metric-bar"><div class="metric-bar-fill" id="sim-bar-${m.key}"></div></div>
            </div>
          `).join('')}
        </div>
        <div class="sim-progress">
          <div class="sim-progress-bar"><div class="sim-progress-fill" id="sim-progress-fill"></div></div>
          <div class="sim-status" id="sim-status-text"></div>
        </div>
      `;

      overlay.classList.add('active');

      // Start progress bar
      setTimeout(() => {
        const fill = document.getElementById('sim-progress-fill');
        if (fill) fill.style.width = '100%';
      }, 50);

      // Animate metric values
      metricDefs.forEach((m, i) => {
        setTimeout(() => {
          const valEl = document.getElementById(`sim-val-${m.key}`);
          const barEl = document.getElementById(`sim-bar-${m.key}`);
          const cardEl = document.getElementById(`sim-metric-${m.key}`);
          if (!valEl) return;

          // Animate number
          this._animateValue(valEl, m.base, m.target, 3000 + i * 200);
          
          // Animate bar
          if (barEl) barEl.style.width = '100%';

          // Color change
          const improved = (m.key === 'accessibility') ? m.target > m.base : m.target < m.base;
          setTimeout(() => {
            if (valEl) valEl.style.color = improved ? '#22c55e' : '#ef4444';
            if (cardEl) cardEl.style.borderColor = improved ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)';
            if (barEl) barEl.style.background = improved ? '#22c55e' : '#ef4444';
          }, 1500 + i * 100);
        }, 300 + i * 150);
      });

      // Cycling status texts
      const statuses = [
        '📍 Mapping traffic regions...',
        '🚌 Calculating bus route coverage...',
        '🏗️ Analyzing infrastructure impact...',
        '🌿 Measuring environmental changes...',
        '📊 Generating comparison data...',
        '✅ Finalizing results...'
      ];
      let statusIdx = 0;
      const statusEl = document.getElementById('sim-status-text');
      const statusInterval = setInterval(() => {
        if (statusEl && statusIdx < statuses.length) {
          statusEl.textContent = statuses[statusIdx];
          statusIdx++;
        }
      }, 700);

      // Complete after 4 seconds
      setTimeout(() => {
        clearInterval(statusInterval);
        const titleEl = overlay.querySelector('.sim-title');
        if (titleEl) {
          titleEl.className = 'sim-complete';
          titleEl.textContent = '✅ Simulation Complete!';
        }
        const subtitleEl = overlay.querySelector('.sim-subtitle');
        if (subtitleEl) subtitleEl.style.display = 'none';

        // Wait 1 more second then resolve
        setTimeout(() => {
          overlay.classList.remove('active');
          resolve();
        }, 1000);
      }, 4000);
    });
  },

  _animateValue(el, start, end, duration) {
    const startTime = performance.now();
    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = start + (end - start) * eased;
      el.textContent = current.toFixed(1);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
};


/* ═══════════════════════════════════════
   SIDEBAR INJECTION
   ═══════════════════════════════════════ */

function injectFeatureSections() {
  const sliderContainer = document.getElementById('slider-container');
  if (!sliderContainer) return;

  // Create a wrapper for feature sections below the slider container
  let featureWrapper = document.getElementById('feature-sections');
  if (!featureWrapper) {
    featureWrapper = document.createElement('div');
    featureWrapper.id = 'feature-sections';
    featureWrapper.style.cssText = 'display:flex;flex-direction:column;gap:15px;margin-top:15px;';
    sliderContainer.after(featureWrapper);
  }

  featureWrapper.innerHTML = `
    <!-- TRAFFIC REGIONS -->
    <div class="sidebar-section">
      <div class="sidebar-section-header" onclick="this.classList.toggle('collapsed');this.nextElementSibling.classList.toggle('collapsed')">
        🚗 Traffic Regions <span class="chevron">▼</span>
      </div>
      <div class="sidebar-section-body">
        <button class="btn-ghost-purple" onclick="TrafficRegionManager.showTrafficRegions()">
          🚗 Show Traffic of Region
        </button>
        <button id="btn-hide-traffic-regions" class="rw-hide-traffic-btn" style="display:none;">Hide Traffic Regions</button>
        <div class="active-items-list" id="traffic-regions-list">
          <div style="color:var(--text-secondary);font-size:0.8rem;padding:5px 0;">No regions drawn yet</div>
        </div>
      </div>
    </div>

    <!-- BUS ROUTES -->
    <div class="sidebar-section">
      <div class="sidebar-section-header" onclick="this.classList.toggle('collapsed');this.nextElementSibling.classList.toggle('collapsed')">
        🚌 Bus Routes <span class="chevron">▼</span>
      </div>
      <div class="sidebar-section-body">
        <button class="btn-ghost-purple" onclick="BusRouteManager.startDrawing();this.classList.add('drawing-active')">
          🚌 Draw Bus Route
        </button>
        <div class="active-items-list" id="bus-routes-list">
          <div style="color:var(--text-secondary);font-size:0.8rem;padding:5px 0;">No routes drawn yet</div>
        </div>
      </div>
    </div>

    <!-- INFRASTRUCTURE -->
    <div class="sidebar-section">
      <div class="sidebar-section-header" onclick="this.classList.toggle('collapsed');this.nextElementSibling.classList.toggle('collapsed')">
        🏗️ Infrastructure <span class="chevron">▼</span>
      </div>
      <div class="sidebar-section-body">
        <button class="btn-ghost-purple" onclick="InfrastructureManager.showPicker()">
          🏗️ Place Infrastructure
        </button>
        <div class="active-items-list" id="infra-placed-list" style="max-height:250px;">
          <div style="color:var(--text-secondary);font-size:0.8rem;padding:5px 0;">No infrastructure placed yet</div>
        </div>
      </div>
    </div>

    <!-- ROAD WORK -->
    <div class="sidebar-section">
      <div class="sidebar-section-header" onclick="this.classList.toggle('collapsed');this.nextElementSibling.classList.toggle('collapsed')">
        🚧 Road Work <span class="chevron">▼</span>
      </div>
      <div class="sidebar-section-body" id="road-work-content">
        <p class="tool-instructions">
          Select a road on the map to mark it as under construction. This will impact travel time, accessibility, emissions and energy use.
        </p>
        <div class="road-work-mode-row">
          <button class="map-tool-btn" id="btn-select-road-work">🚧 Select Road</button>
        </div>
        <div class="road-work-intensity-row">
          <label class="tool-sub-label">Construction Intensity</label>
          <div class="intensity-options">
            <button class="intensity-btn active" data-intensity="minor">Minor</button>
            <button class="intensity-btn" data-intensity="moderate">Moderate</button>
            <button class="intensity-btn" data-intensity="major">Major</button>
            <button class="intensity-btn" data-intensity="full-closure">Full Closure</button>
          </div>
        </div>
        <div class="rw-route-section">
          <p class="tool-sub-label" style="margin-bottom:10px;">Draw Route (Optional)</p>
          <div class="rw-point-row">
            <button class="rw-point-btn" id="btn-rw-start" data-state="idle">
              <span class="rw-point-dot rw-start-dot"></span> Set Start Point
            </button>
            <div class="rw-point-status" id="rw-start-status">Not set</div>
          </div>
          <div class="rw-connector-line"></div>
          <div class="rw-point-row">
            <button class="rw-point-btn" id="btn-rw-end" data-state="idle">
              <span class="rw-point-dot rw-end-dot"></span> Set End Point
            </button>
            <div class="rw-point-status" id="rw-end-status">Not set</div>
          </div>
          <button class="rw-draw-route-btn" id="btn-rw-draw-route" disabled>Draw Road Work Route</button>
          <button class="rw-clear-route-btn" id="btn-rw-clear-route" style="display:none;">Clear Route</button>
        </div>
        <div class="road-work-list" id="road-work-list">
          <p class="no-items-text" id="no-road-work-text">No road works added yet</p>
        </div>
        <button class="clear-btn" id="btn-clear-road-work" style="display:none;">Clear All Road Works</button>
      </div>
    </div>
  `;
}


/* ═══════════════════════════════════════
   FULL SIMULATION RUN (replaces old runSim)
   ═══════════════════════════════════════ */

async function runEnhancedSimulation() {
  const btn = document.getElementById('btnRun');
  const badge = document.getElementById('status-badge');
  
  if (btn) { btn.disabled = true; btn.innerHTML = '⚙️ Simulating...'; }
  if (badge) badge.style.display = 'inline-block';

  // Gather all data
  const aggregated = MetricAggregator.recalculate();
  const baseline = aggregated.baseline;
  const final = aggregated.final;

  // Count policies
  const policyCount = TrafficRegionManager.regions.length + BusRouteManager.routes.length + InfrastructureManager.placed.length;

  // Show overlay animation
  await SimulationOverlay.show(baseline, final, policyCount || 1);

  // Build localStorage data
  const deltas = {};
  ['travelTime','co2','energy','accessibility','cost','congestion','housing','roadHealth'].forEach(k => {
    deltas[k] = final[k] - baseline[k];
  });

  const totalImprovement = ['travelTime','co2','energy'].reduce((sum, k) => {
    const pct = ((final[k] - baseline[k]) / baseline[k]) * 100;
    return sum + (pct < 0 ? Math.abs(pct) : -pct);
  }, 0) / 3;

  const simData = {
    timestamp: new Date().toISOString(),
    city: 'New York City',
    baseline,
    final,
    deltas,
    policies: {
      busRoutes: BusRouteManager.getDataForSave(),
      trafficRegions: TrafficRegionManager.getDataForSave(),
      infrastructure: InfrastructureManager.getDataForSave(),
      bikeLanes: document.getElementById('input-bikeLanes')?.checked || false,
      greenSpaces: document.getElementById('input-greenSpaces')?.checked || false,
      evStations: document.getElementById('input-evStations')?.checked || false,
      heatmapActive: false,
      emissionStandard: 0
    },
    recommendation: totalImprovement > 5 ? 'recommended' : 'revision',
    improvementPercent: Number(totalImprovement.toFixed(1)),
    policyCount
  };

  localStorage.setItem('urbaniq_simulation', JSON.stringify(simData));
  console.log('[Simulation] Saved to localStorage:', simData);

  // Also save to Supabase if available
  if (typeof DB !== 'undefined') {
    try {
      const user = await DB.getUser();
      await DB.saveSimulation({
        user_id: user?.id,
        city_id: 2,
        name: `Sim ${new Date().toLocaleTimeString()}`,
        policy_params: simData.policies,
        results: simData,
        mode: 'enhanced'
      });
      console.log('[Simulation] Saved to Supabase');
    } catch(e) { console.warn('[Simulation] Supabase save failed:', e); }
  }

  // Redirect to results page
  if (btn) { btn.disabled = false; btn.innerHTML = '▶ Run Simulation'; }
  if (badge) badge.style.display = 'none';
  window.location.href = 'results.html';
}


/* ═══════════════════════════════════════
   INITIALIZATION
   ═══════════════════════════════════════ */

function initFeatures(map) {
  if (!map) { console.warn('[Features] No map provided'); return; }
  TrafficRegionManager.init(map);
  BusRouteManager.init(map);
  InfrastructureManager.init(map);
  injectFeatureSections();
  if (typeof RoadWorkManager !== 'undefined') {
    RoadWorkManager.init(map);
  }
  if (typeof RoadWorkRoute !== 'undefined') {
    RoadWorkRoute.init(map);
  }
  MetricAggregator.buildLiveKPICards('kpi-container');
  console.log('[Features] All feature managers initialized');
}
