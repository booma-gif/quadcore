// ─── CITYSIMULATE LIVE DATA INTEGRATION ──────────

// ── API KEYS ──────────────────────────────────────
const TOMTOM_API_KEY = 'JrfnpRTquFFO6MPu2GIInvdZny4XiXtM';
const WAQI_API_KEY = 'a039e605a627e5992f7677b3658cb134716640a2';

// ── BASELINE DEFAULTS (fallback if API fails) ────
const DEFAULT_BASELINE = {
  congestion: 65,
  travelTime: 35,
  energy: 450,
  emissions: 180,
  transit: 40,
  housing: 50,
  economic: 2.5,
  roadHealth: 60
};

// ── LIVE BASELINE (updated by API calls) ─────────
var liveBaseline = Object.assign({}, DEFAULT_BASELINE);
var liveDataLoaded = false;
var lastFetchedCity = '';
var cityCenterMarker = null;
var citySearchDebounce = null;

// ── SAFE MAP VIEW UTILITY ─────────────────────────
function safeSetMapView(lat, lng, zoom, fly) {
  var mapInstance =
    window.CitySimulateMap ||
    window.map ||
    (typeof MapManager !== 'undefined' && MapManager.map ? MapManager.map : null);

  if (!mapInstance) {
    console.warn('CitySimulate: map instance not found.');
    return false;
  }

  try {
    if (fly) {
      mapInstance.flyTo([lat, lng], zoom || 12, { duration: 1.5, easeLinearity: 0.25 });
    } else {
      mapInstance.setView([lat, lng], zoom || 12);
    }
    return true;
  } catch (err) {
    console.warn('Map navigation failed:', err.message);
    return false;
  }
}

// ── OVERPASS MULTI-SERVER FETCH UTILITY ────────────
async function fetchFromOverpass(query) {
  var servers = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
  ];

  for (var i = 0; i < servers.length; i++) {
    try {
      var response = await fetch(servers[i], {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'data=' + encodeURIComponent(query),
        signal: AbortSignal.timeout(15000)
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn('Overpass server failed, trying next:', servers[i]);
      continue;
    }
  }
  throw new Error('All Overpass servers failed');
}

// ── GEOCODE CITY TO COORDINATES ──────────────────
async function geocodeCity(cityName) {
  var url =
    'https://nominatim.openstreetmap.org/search' +
    '?q=' + encodeURIComponent(cityName) +
    '&format=json&limit=1';

  var response = await fetch(url, {
    headers: {
      'Accept-Language': 'en',
      'User-Agent': 'CitySimulate/1.0'
    }
  });

  if (!response.ok) {
    throw new Error('Geocoding failed for: ' + cityName);
  }

  var data = await response.json();

  if (!data || data.length === 0) {
    throw new Error('City not found: ' + cityName);
  }

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name
      .split(',').slice(0, 2).join(', ')
  };
}

// ── API 1: TOMTOM TRAFFIC ─────────────────────────
async function fetchTrafficData(lat, lng) {
  try {
    var url =
      'https://api.tomtom.com/traffic/services/4/' +
      'flowSegmentData/absolute/10/json' +
      '?key=' + TOMTOM_API_KEY +
      '&point=' + lat + ',' + lng +
      '&unit=KMPH';

    var response = await fetch(url);

    if (!response.ok) {
      throw new Error('TomTom API error: ' + response.status);
    }

    var data = await response.json();
    var flow = data.flowSegmentData;

    var currentSpeed = flow.currentSpeed || 30;
    var freeFlowSpeed = flow.freeFlowSpeed || 50;

    var speedRatio = currentSpeed / freeFlowSpeed;
    var congestionScore = Math.round(
      Math.max(0, Math.min(100, (1 - speedRatio) * 100))
    );

    var travelTime = Math.round(20 + (congestionScore * 0.7));

    return {
      success: true,
      congestion: congestionScore,
      travelTime: travelTime,
      currentSpeed: currentSpeed,
      freeFlowSpeed: freeFlowSpeed,
      label: congestionScore < 30
        ? 'Light'
        : congestionScore < 60
          ? 'Moderate'
          : 'Heavy'
    };

  } catch (err) {
    console.warn('TomTom fetch failed:', err.message);
    return {
      success: false,
      congestion: DEFAULT_BASELINE.congestion,
      travelTime: DEFAULT_BASELINE.travelTime,
      error: err.message
    };
  }
}

// ── API 2: WAQI AIR QUALITY ───────────────────────
async function fetchAirQualityData(lat, lng) {
  try {
    var url =
      'https://api.waqi.info/feed/geo:' +
      lat + ';' + lng +
      '/?token=' + WAQI_API_KEY;

    var response = await fetch(url);

    if (!response.ok) {
      throw new Error('WAQI API error: ' + response.status);
    }

    var data = await response.json();

    if (data.status !== 'ok') {
      throw new Error('WAQI returned: ' + data.status);
    }

    var aqi = data.data.aqi || 50;
    var iaqi = data.data.iaqi || {};

    var emissions = Math.round(80 + (aqi * 1.4));

    var no2 = iaqi.no2 ? iaqi.no2.v : null;
    var co = iaqi.co ? iaqi.co.v : null;
    var pm25 = iaqi.pm25 ? iaqi.pm25.v : null;

    var aqiLabel = aqi <= 50 ? 'Good'
      : aqi <= 100 ? 'Moderate'
        : aqi <= 150 ? 'Unhealthy for sensitive'
          : aqi <= 200 ? 'Unhealthy'
            : 'Hazardous';

    return {
      success: true,
      emissions: Math.min(emissions, 600),
      aqi: aqi,
      aqiLabel: aqiLabel,
      no2: no2,
      co: co,
      pm25: pm25,
      station: data.data.city
        ? data.data.city.name
        : 'Unknown station'
    };

  } catch (err) {
    console.warn('WAQI fetch failed:', err.message);
    return {
      success: false,
      emissions: DEFAULT_BASELINE.emissions,
      error: err.message
    };
  }
}

// ── API 3: TRANSITLAND ────────────────────────────
async function fetchTransitData(lat, lng) {
  try {
    var radius = 2000;
    var url =
      'https://transit.land/api/v2/rest/stops' +
      '?lon=' + lng +
      '&lat=' + lat +
      '&radius=' + radius +
      '&limit=100';

    var response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error('Transitland error: ' + response.status);
    }

    var data = await response.json();
    var stops = data.stops || [];
    var stopCount = stops.length;

    var routeTypes = new Set();
    stops.forEach(function (stop) {
      if (stop.route_stops) {
        stop.route_stops.forEach(function (rs) {
          if (rs.route && rs.route.vehicle_type) {
            routeTypes.add(rs.route.vehicle_type);
          }
        });
      }
    });

    var baseScore = Math.min(Math.round(stopCount * 0.8), 80);
    var diversityBonus = Math.min(routeTypes.size * 5, 20);
    var transitScore = Math.min(baseScore + diversityBonus, 100);

    return {
      success: true,
      transit: transitScore,
      stopCount: stopCount,
      routeTypes: routeTypes.size,
      label: transitScore < 30 ? 'Poor'
        : transitScore < 60 ? 'Moderate'
          : transitScore < 80 ? 'Good'
            : 'Excellent'
    };

  } catch (err) {
    console.warn('Transitland fetch failed:', err.message);
    return await fetchTransitOverpassFallback(lat, lng);
  }
}

// ── OVERPASS TRANSIT FALLBACK ──────────────────────
async function fetchTransitOverpassFallback(lat, lng) {
  try {
    var radius = 2000;
    var query =
      '[out:json][timeout:25];' +
      '(' +
      'node["highway"="bus_stop"]' +
      '(around:' + radius + ',' + lat + ',' + lng + ');' +
      'node["public_transport"="stop_position"]' +
      '(around:' + radius + ',' + lat + ',' + lng + ');' +
      'node["railway"="station"]' +
      '(around:' + radius + ',' + lat + ',' + lng + ');' +
      'node["railway"="subway_entrance"]' +
      '(around:' + radius + ',' + lat + ',' + lng + ');' +
      'node["amenity"="bus_station"]' +
      '(around:' + radius + ',' + lat + ',' + lng + ');' +
      ');' +
      'out body;';

    var data = await fetchFromOverpass(query);
    var stopCount = data.elements ? data.elements.length : 0;

    var transitScore = Math.min(Math.round(stopCount * 0.65), 100);

    return {
      success: true,
      transit: Math.max(transitScore, 5),
      stopCount: stopCount,
      label: transitScore < 30 ? 'Poor'
        : transitScore < 60 ? 'Moderate'
          : transitScore < 80 ? 'Good'
            : 'Excellent',
      source: 'OpenStreetMap'
    };

  } catch (err) {
    console.warn('Overpass transit fallback failed:', err.message);
    return {
      success: false,
      transit: DEFAULT_BASELINE.transit,
      error: err.message
    };
  }
}

// ── API 4: OVERPASS (OSM) ROAD HEALTH ─────────────
async function fetchRoadHealthData(lat, lng) {
  try {
    var radius = 3000;

    var query =
      '[out:json][timeout:15];' +
      '(' +
      'way["highway"]["surface"]' +
      '(around:' + radius + ',' + lat + ',' + lng + ');' +
      ');' +
      'out tags;';

    var data = await fetchFromOverpass(query);
    var ways = data.elements || [];

    if (ways.length === 0) {
      return {
        success: true,
        roadHealth: DEFAULT_BASELINE.roadHealth,
        note: 'No surface data available for this area'
      };
    }

    var surfaceScores = {
      'asphalt': 95, 'concrete': 90, 'paved': 85,
      'tarmac': 90, 'concrete:plates': 80, 'sett': 70,
      'cobblestone': 60, 'paving_stones': 75,
      'gravel': 45, 'compacted': 55, 'fine_gravel': 50,
      'unpaved': 30, 'dirt': 20, 'grass': 15,
      'mud': 10, 'sand': 15
    };

    var totalScore = 0;
    var scoredWays = 0;

    ways.forEach(function (way) {
      var surface = way.tags ? way.tags.surface : null;
      if (surface && surfaceScores[surface] !== undefined) {
        totalScore += surfaceScores[surface];
        scoredWays++;
      }
    });

    var roadHealth = scoredWays > 0
      ? Math.round(totalScore / scoredWays)
      : DEFAULT_BASELINE.roadHealth;

    return {
      success: true,
      roadHealth: Math.min(Math.max(roadHealth, 0), 100),
      totalWays: ways.length,
      scoredWays: scoredWays,
      label: roadHealth >= 80 ? 'Good'
        : roadHealth >= 60 ? 'Fair'
          : roadHealth >= 40 ? 'Poor'
            : 'Very Poor'
    };

  } catch (err) {
    console.warn('Road health fetch failed:', err.message);
    return {
      success: false,
      roadHealth: DEFAULT_BASELINE.roadHealth,
      error: err.message
    };
  }
}

// ── CITY SEARCH MAP NAVIGATION ────────────────────
async function navigateMapToCity(cityName) {
  var statusEl = document.getElementById('city-search-status');

  if (!cityName || cityName.trim().length < 2) return;

  if (statusEl) {
    statusEl.className = 'city-search-status searching';
    statusEl.textContent = 'Searching for ' + cityName + '...';
  }

  try {
    var coords = await geocodeCity(cityName.trim());

    var mapInstance =
      window.CitySimulateMap ||
      (typeof MapManager !== 'undefined' && MapManager.map ? MapManager.map : null);

    if (!mapInstance) {
      if (statusEl) {
        statusEl.className = 'city-search-status not-found';
        statusEl.textContent = 'Map not available';
      }
      return;
    }

    // Remove existing city marker
    if (cityCenterMarker) {
      try { mapInstance.removeLayer(cityCenterMarker); } catch (e) { }
      cityCenterMarker = null;
    }

    // Fly smoothly to city
    mapInstance.flyTo([coords.lat, coords.lng], 12, {
      duration: 1.8, easeLinearity: 0.2
    });

    // Place pulsing marker after fly completes
    setTimeout(function () {
      var pulsingIcon = L.divIcon({
        html:
          '<div class="city-pin-pulse">' +
          '<div class="city-pin-dot"></div>' +
          '</div>',
        className: '',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -14]
      });

      cityCenterMarker = L.marker(
        [coords.lat, coords.lng],
        { icon: pulsingIcon, zIndexOffset: 1000 }
      ).addTo(mapInstance);

      cityCenterMarker.bindPopup(
        '<div style="text-align:center;min-width:120px;">' +
        '<b style="color:#00c896;font-size:13px;">' +
        coords.displayName +
        '</b><br>' +
        '<span style="font-size:11px;color:#7ab89a;">' +
        coords.lat.toFixed(4) + ', ' +
        coords.lng.toFixed(4) +
        '</span>' +
        '</div>',
        { closeButton: false, className: 'city-popup' }
      ).openPopup();
    }, 1900);

    if (statusEl) {
      statusEl.className = 'city-search-status found';
      statusEl.textContent = 'Showing ' + coords.displayName;
      setTimeout(function () {
        if (statusEl) statusEl.textContent = '';
      }, 4000);
    }

  } catch (err) {
    console.warn('City navigation failed:', err);
    if (statusEl) {
      statusEl.className = 'city-search-status not-found';
      statusEl.textContent = 'City not found. Try a different name.';
      setTimeout(function () {
        if (statusEl) statusEl.textContent = '';
      }, 3000);
    }
  }
}

// ── MASTER FETCH FUNCTION ─────────────────────────
async function fetchLiveDataForCity(cityName) {

  var statusEl = document.getElementById('live-data-status');
  var badgesEl = document.getElementById('live-data-badges');
  var btn = document.getElementById('btn-fetch-live-data');
  var btnText = document.getElementById('fetch-btn-text');

  if (btn) { btn.disabled = true; btn.classList.add('loading'); }
  if (btnText) btnText.textContent = 'Fetching...';
  if (statusEl) {
    statusEl.style.display = 'block';
    statusEl.className = 'live-data-status';
    statusEl.textContent = 'Locating ' + cityName + '...';
  }

  try {
    updateStatus(statusEl, 'Finding coordinates for ' + cityName + '...');
    var coords = await geocodeCity(cityName);

    updateStatus(statusEl, 'Fetching live data from 4 sources...');

    var results = await Promise.all([
      fetchTrafficData(coords.lat, coords.lng),
      fetchAirQualityData(coords.lat, coords.lng),
      fetchTransitData(coords.lat, coords.lng),
      fetchRoadHealthData(coords.lat, coords.lng)
    ]);

    var traffic = results[0];
    var airQuality = results[1];
    var transit = results[2];
    var roads = results[3];

    // Update liveBaseline
    if (traffic.success) {
      liveBaseline.congestion = traffic.congestion;
      liveBaseline.travelTime = traffic.travelTime;
    }
    if (airQuality.success) {
      liveBaseline.emissions = airQuality.emissions;
    }
    if (transit.success) {
      liveBaseline.transit = transit.transit;
    }
    if (roads.success) {
      liveBaseline.roadHealth = roads.roadHealth;
    }

    // Push into simulation engine baseline
    if (typeof window.SIMULATION_BASELINE !== 'undefined') {
      window.SIMULATION_BASELINE.congestionScore = liveBaseline.congestion;
      window.SIMULATION_BASELINE.travelTime = liveBaseline.travelTime;
      window.SIMULATION_BASELINE.carbonEmissions = liveBaseline.emissions;
      window.SIMULATION_BASELINE.transitAccessibility = liveBaseline.transit;
      window.SIMULATION_BASELINE.roadHealth = liveBaseline.roadHealth;
    }

    // Update MetricAggregator baseline
    if (typeof MetricAggregator !== 'undefined' && MetricAggregator.baseline) {
      MetricAggregator.baseline.congestion = liveBaseline.congestion;
      MetricAggregator.baseline.travelTime = liveBaseline.travelTime;
      MetricAggregator.baseline.co2 = liveBaseline.emissions;
      MetricAggregator.baseline.accessibility = liveBaseline.transit;
      MetricAggregator.baseline.roadHealth = liveBaseline.roadHealth;
      MetricAggregator.recalculate();
    }

    liveDataLoaded = true;
    lastFetchedCity = cityName;

    updateBaselineDisplays();

    // Update data badges
    if (badgesEl) {
      badgesEl.style.display = 'flex';

      updateBadge('badge-traffic',
        traffic.success
          ? '🚦 ' + traffic.label + ' traffic'
          : '🚦 Using default',
        traffic.success ? '' : 'error'
      );

      updateBadge('badge-air',
        airQuality.success
          ? '🌿 AQI ' + airQuality.aqi + ' (' + airQuality.aqiLabel + ')'
          : '🌿 Using default',
        airQuality.success ? '' : 'error'
      );

      updateBadge('badge-transit',
        transit.success
          ? '🚌 ' + (transit.stopCount || '?') + ' stops nearby'
          : '🚌 Using default',
        transit.success ? '' : 'error'
      );

      updateBadge('badge-roads',
        roads.success
          ? '🛣️ Roads: ' + (roads.label || 'OK')
          : '🛣️ Using default',
        roads.success ? '' : 'error'
      );
    }

    // Pan map safely with delay
    setTimeout(function () {
      safeSetMapView(coords.lat, coords.lng, 12, false);
    }, 300);

    // Show success status
    var successCount = [
      traffic.success,
      airQuality.success,
      transit.success,
      roads.success
    ].filter(Boolean).length;

    if (statusEl) {
      statusEl.className = 'live-data-status success';
      statusEl.textContent =
        coords.displayName + ' — ' +
        successCount + '/4 sources loaded live';
    }

    addLiveIndicators(
      traffic.success,
      airQuality.success,
      transit.success,
      roads.success
    );

    return {
      success: true,
      city: coords.displayName,
      traffic: traffic,
      airQuality: airQuality,
      transit: transit,
      roads: roads
    };

  } catch (err) {
    console.error('Live data fetch error:', err);

    if (statusEl) {
      var isMapError = err.message && err.message.includes('setView');

      if (isMapError) {
        statusEl.className = 'live-data-status success';
        statusEl.textContent = 'Live data loaded. Map view update skipped.';
      } else {
        statusEl.className = 'live-data-status error';
        statusEl.textContent = 'Some data unavailable — using defaults.';
      }
    }

    return { success: false, error: err.message };

  } finally {
    if (btn) { btn.disabled = false; btn.classList.remove('loading'); }
    if (btnText) {
      btnText.textContent = liveDataLoaded
        ? 'Refresh Live Data'
        : 'Fetch Live Data';
    }
  }
}

// ── HELPERS ───────────────────────────────────────
function updateStatus(el, message) {
  if (el) el.textContent = message;
}

function updateBadge(id, text, type) {
  var el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = 'data-badge' + (type ? ' ' + type : '');
}

function updateBaselineDisplays() {
  var baseMap = {
    'base-congestion': liveBaseline.congestion,
    'base-travelTime': liveBaseline.travelTime,
    'base-emissions': liveBaseline.emissions,
    'base-transit': liveBaseline.transit,
    'base-roadHealth': liveBaseline.roadHealth
  };

  Object.keys(baseMap).forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.textContent = baseMap[id];
  });

  var tableMap = {
    'before-congestion': liveBaseline.congestion,
    'before-travelTime': liveBaseline.travelTime,
    'before-emissions': liveBaseline.emissions,
    'before-transit': liveBaseline.transit,
    'before-roadHealth': liveBaseline.roadHealth
  };

  Object.keys(tableMap).forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.textContent = tableMap[id];
  });
}

function addLiveIndicators(trafficLive, airLive, transitLive, roadsLive) {
  var indicators = {
    'kpi-congestion': trafficLive,
    'kpi-travelTime': trafficLive,
    'kpi-emissions': airLive,
    'kpi-transit': transitLive,
    'kpi-roadHealth': roadsLive
  };

  Object.keys(indicators).forEach(function (cardId) {
    var card = document.getElementById(cardId);
    if (!card || !indicators[cardId]) return;

    var existing = card.querySelector('.live-indicator');
    if (existing) existing.remove();

    var label = card.querySelector('.kpi-label');
    if (label) {
      var dot = document.createElement('span');
      dot.className = 'live-indicator';
      dot.title = 'Live data';
      label.appendChild(dot);
    }
  });
}

// ── EXPOSE GLOBALLY ───────────────────────────────
window.liveBaseline = liveBaseline;
window.liveDataLoaded = liveDataLoaded;
window.fetchLiveDataForCity = fetchLiveDataForCity;
window.navigateMapToCity = navigateMapToCity;

// ── WIRE BUTTON CLICK ─────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  document.body.addEventListener('click', function (e) {
    if (e.target.closest('#btn-fetch-live-data')) {
      var cityInput = document.getElementById('city-search-input');
      var cityName = cityInput ? cityInput.value.trim() : 'London';
      if (cityName) {
        navigateMapToCity(cityName);
        fetchLiveDataForCity(cityName);
      }
    }
  });

  var cityInput = document.getElementById('city-search-input');
  if (cityInput) {
    cityInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var cityName = this.value.trim();
        if (cityName) {
          navigateMapToCity(cityName);
          fetchLiveDataForCity(cityName);
        }
      }
    });
  }
});

// ─── END LIVE DATA MODULE ─────────────────────────
