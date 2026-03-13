// charts.js
// Chart.js Integration

const ChartTheme = {
  backgroundColor: 'transparent',
  textColor: '#7ab89a',
  gridColor: '#1a2e22',
  primary: '#00c896',
  secondary: '#00e6b0',
  baseline: '#2a4a35',
  easing: 'easeInOutQuart',
  duration: 800
};

const ChartManager = {
  instances: {},

  initChart(canvasId, config) {
    if (typeof Chart === 'undefined') {
        console.warn("Chart.js not loaded.");
        return;
    }
    Chart.defaults.color = ChartTheme.textColor;
    Chart.defaults.font.family = "'Inter', sans-serif";
    
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (this.instances[canvasId]) {
        this.instances[canvasId].destroy();
    }

    this.instances[canvasId] = new Chart(ctx, config);
    return this.instances[canvasId];
  },

  renderMetricsLineChart(canvasId, timeSeries) {
    const labels = Array.from({length: 12}, (_, i) => `Month ${i+1}`);
    const datasets = [
        {
            label: 'Congestion',
            data: timeSeries.congestionScore,
            borderColor: '#e05050',
            tension: 0.4
        },
        {
            label: 'Transit Access',
            data: timeSeries.transitAccessibility,
            borderColor: ChartTheme.primary,
            tension: 0.4
        },
        {
            label: 'Carbon Emissions',
            data: timeSeries.carbonEmissions.map(v => v/10), // Scale for visibility
            borderColor: ChartTheme.secondary,
            borderDash: [5, 5],
            tension: 0.4
        }
    ];

    this.initChart(canvasId, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: ChartTheme.duration, easing: ChartTheme.easing },
            scales: {
                x: { grid: { color: ChartTheme.gridColor } },
                y: { grid: { color: ChartTheme.gridColor } }
            },
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
  },

  renderMetricsBarChart(canvasId, baseline, policy) {
    const labels = ['Traffic', 'Time', 'Energy', 'Emissions', 'Transit', 'Housing', 'Econ', 'Roads'];
    // Scale data loosely to fit 0-100 visual scale so bars are comparable in a single chart
    const bData = [
       baseline.congestionScore,
       baseline.travelTime,
       baseline.energyConsumption / 10,
       baseline.carbonEmissions / 5,
       baseline.transitAccessibility,
       baseline.housingAffordability,
       baseline.economicImpact * 20,
       baseline.roadHealth
    ];
    const pData = [
       policy.congestionScore,
       policy.travelTime,
       policy.energyConsumption / 10,
       policy.carbonEmissions / 5,
       policy.transitAccessibility,
       policy.housingAffordability,
       policy.economicImpact * 20,
       policy.roadHealth
    ];

    this.initChart(canvasId, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Baseline',
                    data: bData,
                    backgroundColor: ChartTheme.baseline
                },
                {
                    label: 'With Policy',
                    data: pData,
                    backgroundColor: ChartTheme.primary
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: ChartTheme.duration, easing: ChartTheme.easing },
            scales: {
                x: { grid: { color: ChartTheme.gridColor } },
                y: { grid: { color: ChartTheme.gridColor } }
            },
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
  },

  renderRadarChart(canvasId, city1Data, city2Data, city1Name="City A", city2Name="City B") {
    const labels = ["Congestion", "Travel Time", "Energy", "Emissions", "Transit", "Housing", "Economy", "Roads"];
    // Assume input data is already scaled 0-100 for radar
    this.initChart(canvasId, {
        type: 'radar',
        data: {
            labels,
            datasets: [
                {
                    label: city1Name,
                    data: city1Data,
                    backgroundColor: 'rgba(0, 200, 150, 0.2)',
                    borderColor: ChartTheme.primary,
                    pointBackgroundColor: ChartTheme.primary
                },
                {
                    label: city2Name,
                    data: city2Data,
                    backgroundColor: 'rgba(224, 80, 80, 0.2)',
                    borderColor: '#e05050',
                    pointBackgroundColor: '#e05050'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: ChartTheme.gridColor },
                    grid: { color: ChartTheme.gridColor },
                    pointLabels: { color: ChartTheme.textColor, font: { size: 11 } },
                    ticks: { display: false }
                }
            },
            plugins: { legend: { position: 'bottom' } }
        }
    });
  }
};
