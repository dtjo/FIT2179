
const vegaOptions = { actions: false, renderer: 'svg' };

const chartList = [
  ['#inflation-chart', 'charts/inflation_power.json'],
  ['#cpi-chart', 'charts/cpi.json'],
  ['#map-chart', 'charts/state_map.json'],
  ['#wpi-chart', 'charts/wpi_vs_inflation.json'],
  ['#coffee-chart', 'charts/coffee_vs_cpi.json'],
  ['#rent-chart', 'charts/rent_index.json'],
  ['#asx-chart', 'charts/asx_vs_cpi.json'],
  ['#gold-chart', 'charts/gold_vs_cash.json'],
  ['#jobs-chart', 'charts/jobs.json']
];

for (const [target, spec] of chartList) {
  vegaEmbed(target, spec, vegaOptions).catch(error => {
    document.querySelector(target).innerHTML = `<p style="color:#e05c3a;font-family:DM Mono,monospace;font-size:12px;">Chart failed to load: ${spec}</p>`;
    console.error(error);
  });
}

const inflationData = [
  { year: 2015, inflation: 1.51, value: 100.00 },
  { year: 2016, inflation: 1.28, value: 98.44 },
  { year: 2017, inflation: 1.95, value: 96.52 },
  { year: 2018, inflation: 1.91, value: 94.68 },
  { year: 2019, inflation: 1.61, value: 93.16 },
  { year: 2020, inflation: 0.85, value: 92.37 },
  { year: 2021, inflation: 2.86, value: 89.72 },
  { year: 2022, inflation: 6.59, value: 83.81 },
  { year: 2023, inflation: 5.60, value: 79.36 },
  { year: 2024, inflation: 3.17, value: 76.85 },
  { year: 2025, inflation: 3.80, value: 73.93 }
];

function updateSlider(index) {
  const point = inflationData[index];
  document.getElementById('slider-year').textContent = point.year;
  document.getElementById('slider-value').textContent = `$${point.value.toFixed(2)}`;
  document.getElementById('slider-inflation').textContent = `${point.inflation.toFixed(2)}%`;
  document.getElementById('slider-lost').textContent = `$${(100 - point.value).toFixed(2)}`;
  const activeBaskets = Math.round(point.value / 4);
  const grid = document.getElementById('icon-grid');
  grid.innerHTML = '';
  for (let i = 0; i < 25; i += 1) {
    const cell = document.createElement('div');
    cell.className = `icon-cell ${i < activeBaskets ? 'alive' : 'dead'}`;
    cell.textContent = '🛒';
    grid.appendChild(cell);
  }
}

document.getElementById('year-slider').addEventListener('input', event => updateSlider(Number(event.target.value)));
updateSlider(0);

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.08 });

document.querySelectorAll('.fade-in').forEach(section => observer.observe(section));
