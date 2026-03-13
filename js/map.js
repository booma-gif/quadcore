// map.js
// Leaflet Map Integration

const MapConfig = {
  defaultCenter: [51.505, -0.09], // London
  defaultZoom: 12,
  tileLayer: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>'
};

const MapManager = {
  map: null,
  gridLayer: null,
  markersLayer: null,
  heatLayer: null,

  init(containerId) {
    if (this.map) return this.map;
    
    // Only init if L is defined
    if (typeof L === 'undefined') {
        console.warn("Leaflet library not found.");
        return null;
    }

    this.map = L.map(containerId).setView(MapConfig.defaultCenter, MapConfig.defaultZoom);
    
    L.tileLayer(MapConfig.tileLayer, {
        attribution: MapConfig.attribution,
        maxZoom: 19
    }).addTo(this.map);

    this.gridLayer = L.layerGroup().addTo(this.map);
    this.markersLayer = L.layerGroup().addTo(this.map);
    this.heatLayer = L.layerGroup().addTo(this.map);

    return this.map;
  },

  setCity(lat, lng, zoom = 12) {
    if (this.map) {
        this.map.setView([lat, lng], zoom);
    }
  },

  toggleGrid(show) {
    if (!this.map) return;
    this.gridLayer.clearLayers();
    
    if (show) {
        const bounds = this.map.getBounds();
        const north = bounds.getNorth();
        const south = bounds.getSouth();
        const east = bounds.getEast();
        const west = bounds.getWest();

        const latStep = (north - south) / 10;
        const lngStep = (east - west) / 10;

        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
                const rectBounds = [
                    [south + (i * latStep), west + (j * lngStep)],
                    [south + ((i + 1) * latStep), west + ((j + 1) * lngStep)]
                ];
                
                L.rectangle(rectBounds, {
                    color: '#00c896',
                    weight: 1,
                    fillColor: '#00c896',
                    fillOpacity: 0.1
                }).addTo(this.gridLayer);
            }
        }
    }
  },

  drawSimulationResults(metrics) {
      if (!this.map) return;
      this.markersLayer.clearLayers();

      const bounds = this.map.getBounds();
      const north = bounds.getNorth();
      const south = bounds.getSouth();
      const east = bounds.getEast();
      const west = bounds.getWest();
      
      const congestion = metrics.congestionScore;
      let color = '#00c896'; // Green
      if (congestion >= 40 && congestion <= 70) color = '#f0c040'; // Yellow
      if (congestion > 70) color = '#e05050'; // Red
      
      for(let i=0; i<10; i++) {
          const lat = south + Math.random() * (north - south);
          const lng = west + Math.random() * (east - west);
          
          L.circleMarker([lat, lng], {
              radius: 8,
              fillColor: color,
              color: '#111a14',
              weight: 2,
              opacity: 1,
              fillOpacity: 0.8
          }).bindPopup(`
              <div style="background:#111a14;color:#e8f5f0;padding:5px;">
                  <strong style="color:#00c896">Zone ${i+1}</strong><br/>
                  Congestion: ${Math.round(congestion + (Math.random()*10 - 5))}<br/>
                  Travel Time: ${Math.round(metrics.travelTime + (Math.random()*5 - 2.5))} min
              </div>
          `).addTo(this.markersLayer);
      }
  },

  drawHeatmap(metricType, metrics) {
     if(!this.map) return;
     this.heatLayer.clearLayers();
     
     const bounds = this.map.getBounds();
     const north = bounds.getNorth();
     const south = bounds.getSouth();
     const east = bounds.getEast();
     const west = bounds.getWest();

     // Choose color based on metric
     let color = '#00c896';
     if(metricType === 'congestion' || metricType === 'energy') {
         color = metrics[metricType === 'congestion' ? 'congestionScore' : 'energyConsumption'] > 50 ? '#e05050' : '#00c896';
     } else if(metricType === 'transit') {
         color = metrics.transitAccessibility < 50 ? '#e05050' : '#00c896';
     }

     for(let i=0; i<30; i++) {
         const lat = south + Math.random() * (north - south);
         const lng = west + Math.random() * (east - west);
         
         L.circleMarker([lat, lng], {
             radius: 40 + Math.random() * 20,
             fillColor: color,
             color: 'transparent',
             weight: 0,
             fillOpacity: 0.2 + (Math.random()*0.3)
         }).addTo(this.heatLayer);
     }
  }
};
