// simulation.js
// Simulation Engine for CitySimulate

const SimulationEngine = {
  // Clamp value between min and max
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  },

  // Linearly interpolate between baseline and final value over steps
  generateTimeSteps(baseline, finalValue, steps = 12) {
    const timeSeries = [];
    const stepSize = (finalValue - baseline) / (steps - 1);
    for (let i = 0; i < steps; i++) {
        // Base math for linear progression + slight variation for realization
        let val = baseline + (stepSize * i);
        // Add minimal noise (±1%) for visual realism
        const noise = val * 0.01 * (Math.random() * 2 - 1);
        timeSeries.push(Number((val + noise).toFixed(2)));
    }
    // ensure exactly target at end
    timeSeries[steps - 1] = Number(finalValue.toFixed(2));
    return timeSeries;
  },

  calculateMetrics(params) {
    const { transport, roads, energy, transit, housing } = params;

    // 1. Traffic Congestion Score (0-100, lower is better)
    let congestionScore = 65;
    if (transport.congestionCharge) congestionScore -= 15;
    congestionScore += (transport.trafficDensity - 50) * 0.4;
    congestionScore -= (transport.speedLimit - 50) * 0.1;
    congestionScore = this.clamp(congestionScore, 0, 100);

    // 2. Average Travel Time (minutes)
    let travelTime = 35;
    travelTime += congestionScore * 0.3;
    travelTime -= (transit.metroCoverage / 100) * 10;
    travelTime -= (transit.busFrequency < 10 ? 5 : 0);
    travelTime = Math.max(travelTime, 5); // Minimum 5 mins

    // 3. Energy Consumption (GWh)
    let energyConsumption = 450;
    energyConsumption -= energy.renewablePercent * 2;
    energyConsumption -= energy.smartGrid ? 40 : 0;
    energyConsumption += energy.gridLoad * 1.5;
    energyConsumption = Math.max(energyConsumption, 50);

    // 4. Carbon Emissions (tonnes CO2)
    let carbonEmissions = energyConsumption * 0.4;
    carbonEmissions -= energy.renewablePercent * 3;
    carbonEmissions -= housing.greenSpace * 2;
    carbonEmissions = Math.max(carbonEmissions, 0);

    // 5. Transit Accessibility (0-100, higher is better)
    let transitAccessibility = 40;
    transitAccessibility += transit.metroCoverage * 0.4;
    transitAccessibility += (30 - transit.busFrequency) * 1.5;
    transitAccessibility -= transit.farePrice * 0.5;
    transitAccessibility = this.clamp(transitAccessibility, 0, 100);

    // 6. Housing Affordability (0-100, higher is better)
    let housingAffordability = 50;
    housingAffordability += housing.affordablePercent * 0.8;
    housingAffordability -= (housing.zoningDensity === 'high' ? -10 : housing.zoningDensity === 'low' ? 10 : 0);
    housingAffordability = this.clamp(housingAffordability, 0, 100);

    // 7. Economic Impact ($ billions)
    let economicImpact = 2.5;
    economicImpact += (transitAccessibility / 100) * 3;
    economicImpact += roads.roadExpansion ? 1.2 : 0;
    economicImpact -= roads.constructionZones * 0.3;
    economicImpact = Math.max(economicImpact, 0.1);

    // 8. Road Health Score (0-100, higher is better)
    let roadHealth = roads.roadQuality;
    roadHealth -= roads.constructionZones * 5;
    roadHealth += roads.roadExpansion ? 10 : 0;
    roadHealth = this.clamp(roadHealth, 0, 100);

    return {
      congestionScore,
      travelTime,
      energyConsumption,
      carbonEmissions,
      transitAccessibility,
      housingAffordability,
      economicImpact,
      roadHealth
    };
  },

  runSimulation(params) {
    // Generate final metrics
    const finalMetrics = this.calculateMetrics(params);

    // Baseline definitions (default state)
    const baselineMetrics = {
      congestionScore: 65,
      travelTime: 35 + (65 * 0.3), // approx 54.5
      energyConsumption: 450 + (50 * 1.5), // approx 525
      carbonEmissions: (450 + 50 * 1.5) * 0.4, // approx 210
      transitAccessibility: 40 + (30-15)*1.5, // approx 62.5
      housingAffordability: 50,
      economicImpact: 2.5,
      roadHealth: 50
    };

    // Generate time series for charts
    const timeSeries = {
      congestionScore: this.generateTimeSteps(baselineMetrics.congestionScore, finalMetrics.congestionScore),
      travelTime: this.generateTimeSteps(baselineMetrics.travelTime, finalMetrics.travelTime),
      energyConsumption: this.generateTimeSteps(baselineMetrics.energyConsumption, finalMetrics.energyConsumption),
      carbonEmissions: this.generateTimeSteps(baselineMetrics.carbonEmissions, finalMetrics.carbonEmissions),
      transitAccessibility: this.generateTimeSteps(baselineMetrics.transitAccessibility, finalMetrics.transitAccessibility),
      housingAffordability: this.generateTimeSteps(baselineMetrics.housingAffordability, finalMetrics.housingAffordability),
      economicImpact: this.generateTimeSteps(baselineMetrics.economicImpact, finalMetrics.economicImpact),
      roadHealth: this.generateTimeSteps(baselineMetrics.roadHealth, finalMetrics.roadHealth)
    };

    return {
      baseline: baselineMetrics,
      final: finalMetrics,
      timeSeries
    };
  }
};
