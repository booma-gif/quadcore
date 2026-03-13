// policies.js
// Configuration for policy modules, sliders, defaults, etc.

const PoliciesConfig = {
  transport: {
    name: 'Transportation',
    icon: '🚗',
    params: {
        trafficDensity: { label: 'Traffic Density (%)', type: 'range', min: 0, max: 100, step: 1, default: 50 },
        speedLimit: { label: 'Speed Limit (km/h)', type: 'select', options: [30, 50, 70, 100], default: 50 },
        congestionCharge: { label: 'Congestion Charge', type: 'toggle', default: false }
    }
  },
  roads: {
    name: 'Road Infrastructure',
    icon: '🛣️',
    params: {
        roadQuality: { label: 'Road Quality (%)', type: 'range', min: 0, max: 100, step: 1, default: 50 },
        constructionZones: { label: 'Construction Zones', type: 'number', min: 0, max: 20, step: 1, default: 2 },
        roadExpansion: { label: 'Road Expansion Project', type: 'toggle', default: false }
    }
  },
  energy: {
    name: 'Energy Grid',
    icon: '⚡',
    params: {
        renewablePercent: { label: 'Renewable Energy (%)', type: 'range', min: 0, max: 100, step: 1, default: 20 },
        gridLoad: { label: 'Grid Load (%)', type: 'range', min: 0, max: 100, step: 1, default: 60 },
        smartGrid: { label: 'Implement Smart Grid', type: 'toggle', default: false }
    }
  },
  transit: {
    name: 'Public Transit',
    icon: '🚇',
    params: {
        busFrequency: { label: 'Bus Frequency (mins)', type: 'range', min: 5, max: 30, step: 1, default: 15 },
        metroCoverage: { label: 'Metro Coverage (%)', type: 'range', min: 0, max: 100, step: 1, default: 40 },
        farePrice: { label: 'Fare Price ($)', type: 'number', min: 0, max: 10, step: 0.5, default: 2.5 }
    }
  },
  housing: {
    name: 'Housing & Zoning',
    icon: '🏢',
    params: {
        zoningDensity: { label: 'Zoning Density', type: 'select', options: ['low', 'medium', 'high'], default: 'medium' },
        affordablePercent: { label: 'Affordable Housing (%)', type: 'range', min: 0, max: 100, step: 1, default: 10 },
        greenSpace: { label: 'Green Space (%)', type: 'range', min: 0, max: 100, step: 1, default: 20 }
    }
  }
};

const MetricsConfig = {
  congestionScore: { label: 'Traffic Congestion', unit: '', goodDirection: 'down', icon: '🚦' },
  travelTime: { label: 'Avg Travel Time', unit: 'min', goodDirection: 'down', icon: '⏱️' },
  energyConsumption: { label: 'Energy Demand', unit: 'GWh', goodDirection: 'down', icon: '🔋' },
  carbonEmissions: { label: 'Carbon Emissions', unit: 'tCO2', goodDirection: 'down', icon: '☁️' },
  transitAccessibility: { label: 'Transit Accessibility', unit: '', goodDirection: 'up', icon: '🚆' },
  housingAffordability: { label: 'Housing Affordability', unit: '', goodDirection: 'up', icon: '🏡' },
  economicImpact: { label: 'Economic Impact', unit: '$B', goodDirection: 'up', icon: '📈' },
  roadHealth: { label: 'Road Health Score', unit: '', goodDirection: 'up', icon: '🛣️' }
};

function getDefaultParams() {
  const params = {};
  for (const module in PoliciesConfig) {
    params[module] = {};
    for (const key in PoliciesConfig[module].params) {
      params[module][key] = PoliciesConfig[module].params[key].default;
    }
  }
  return params;
}
