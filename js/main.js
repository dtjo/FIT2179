const vegaOptions = { actions: false, renderer: 'svg' };

const chartList = [
  ['#inflation-chart', 'charts/inflation_power.json'],
  ['#cpi-chart', 'charts/cpi.json'],
  ['#state_map', 'charts/state_map.json'],
  ['#wpi-chart', 'charts/wpi_vs_inflation.json'],
  ['#coffee-chart', 'charts/coffee_vs_cpi.json'],
  ['#asx-chart', 'charts/asx_vs_cpi.json'],
  ['#gold-chart', 'charts/gold_vs_cash.json'],
  ['#jobs-chart', 'charts/jobs.json'],
  ['#entertainment-chart', 'charts/entertainment.json'],
  ['#bigmac-chart', 'charts/big_mac.json']
];

for (const [target, spec] of chartList) {
  const element = document.querySelector(target);

  if (element) {
    vegaEmbed(target, spec, vegaOptions).catch(error => {
      element.innerHTML = `<p style="color:#e05c3a;font-family:DM Mono,monospace;font-size:12px;">Chart failed to load: ${spec}</p>`;
      console.error(error);
    });
  }
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

document.getElementById('year-slider').addEventListener('input', event => {
  updateSlider(Number(event.target.value));
});

updateSlider(0);

/* ─────────────────────────────────────────────
   RENT: three-panel interactive (left buttons + chart + map, kept in sync)
   ───────────────────────────────────────────── */

// State / territory → capital-city column in adjusted_rent.csv + CPI from the map data
const STATES = [
  { abbr: 'NSW', name: 'New South Wales',              city: 'Sydney',    cpi: '4.4%' },
  { abbr: 'VIC', name: 'Victoria',                     city: 'Melbourne', cpi: '4.6%' },
  { abbr: 'QLD', name: 'Queensland',                   city: 'Brisbane',  cpi: '4.7%' },
  { abbr: 'SA',  name: 'South Australia',              city: 'Adelaide',  cpi: '4.9%' },
  { abbr: 'WA',  name: 'Western Australia',            city: 'Perth',     cpi: '4.6%' },
  { abbr: 'TAS', name: 'Tasmania',                     city: 'Hobart',    cpi: '5.1%' },
  { abbr: 'NT',  name: 'Northern Territory',           city: 'Darwin',    cpi: '4.2%' },
  { abbr: 'ACT', name: 'Australian Capital Territory', city: 'Canberra',  cpi: '4.2%' }
];

// Map the TopoJSON full state names to our entries (for map-click sync)
const NAME_TO_STATE = {
  'New South Wales': 'NSW',
  'Victoria': 'VIC',
  'Queensland': 'QLD',
  'South Australia': 'SA',
  'Western Australia': 'WA',
  'Tasmania': 'TAS',
  'Northern Territory': 'NT',
  'Australian Capital Territory': 'ACT'
};

const rentEls = {
  select: document.getElementById('state-select'),
  name: document.getElementById('info-name'),
  rent: document.getElementById('info-rent'),
  change: document.getElementById('info-change'),
  cpi: document.getElementById('info-cpi')
};

let rentRows = [];      // parsed adjusted_rent.csv
let rentChartView = null;
let rentMapView = null;
let currentAbbr = 'NSW';

// Tiny CSV parser (no dependency) — handles the simple Year + city-columns format
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const cells = line.split(',');
    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i] !== undefined ? cells[i].trim() : ''; });
    return row;
  });
}

function computeRentInfo(city) {
  if (!rentRows.length) return { latest: null, change: null };
  const years = rentRows.map(r => Number(r.Year)).filter(n => !isNaN(n));
  const minYear = Math.min(...years), maxYear = Math.max(...years);
  const first = rentRows.find(r => Number(r.Year) === minYear);
  const last = rentRows.find(r => Number(r.Year) === maxYear);
  const baseVal = first ? Number(first[city]) : null;
  const lastVal = last ? Number(last[city]) : null;
  let pct = null;
  if (baseVal && lastVal) pct = ((lastVal - baseVal) / baseVal) * 100;
  return { latest: lastVal, change: pct, year: maxYear };
}

function renderDropdown() {
  rentEls.select.innerHTML = '';
  STATES.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.abbr;
    opt.textContent = `${s.name} (${s.abbr})`;
    rentEls.select.appendChild(opt);
  });
  rentEls.select.addEventListener('change', e => selectState(e.target.value, 'dropdown'));
}

function updateInfo(state) {
  const info = computeRentInfo(state.city);
  rentEls.name.textContent = `${state.name} · ${state.city}`;
  if (info.latest != null) {
    rentEls.rent.textContent = info.latest.toFixed(0);
    const up = info.change >= 0;
    rentEls.change.textContent = `${up ? '+' : ''}${info.change.toFixed(1)}%`;
    rentEls.change.className = up ? 'up' : 'down';
  } else {
    rentEls.rent.textContent = '—';
    rentEls.change.textContent = '—';
    rentEls.change.className = '';
  }
  rentEls.cpi.textContent = state.cpi;
}

// Single entry point — called by buttons AND by map clicks
function selectState(abbr, source) {
  const state = STATES.find(s => s.abbr === abbr);
  if (!state) return;
  currentAbbr = abbr;

  // 1. dropdown (keep in sync, including when a map click drives the change)
  if (rentEls.select.value !== abbr) rentEls.select.value = abbr;

  // 2. info panel
  updateInfo(state);

  // 3. chart — set the Selected_city signal
  if (rentChartView) {
    try { rentChartView.signal('Selected_city', state.city).runAsync(); } catch (e) { /* noop */ }
  }

  // 4. map highlight — set the selectedState signal (always, both directions)
  if (rentMapView) {
    try { rentMapView.signal('selectedState', state.name).runAsync(); } catch (e) { /* noop */ }
  }
}

async function initRentPanels() {
  renderDropdown();

  // Fetch the rent CSV so the info panel shows real numbers
  try {
    const res = await fetch('data/adjusted_rent.csv');
    if (res.ok) rentRows = parseCSV(await res.text());
  } catch (e) { console.error('rent csv fetch failed', e); }

  // Embed the chart
  try {
    const r = await vegaEmbed('#rent-chart', 'charts/rent_index.json', vegaOptions);
    rentChartView = r.view;
  } catch (e) { console.error('rent chart failed', e); }

  // Embed the map and listen for clicks
  try {
    const m = await vegaEmbed('#rent-map', 'charts/rent_map.json', vegaOptions);
    rentMapView = m.view;

    // Feed real rent values (latest year) into the map, keyed by state name
    if (rentRows.length) {
      const years = rentRows.map(r => Number(r.Year)).filter(n => !isNaN(n));
      const maxYear = Math.max(...years);
      const lastRow = rentRows.find(r => Number(r.Year) === maxYear);
      const rentByState = STATES.map(s => ({
        state: s.name,
        rent: lastRow ? Number(lastRow[s.city]) : 100
      }));
      try {
        rentMapView.data('rentByState', rentByState).runAsync();
      } catch (e) { console.error('rent map data inject failed', e); }
    }

    rentMapView.addSignalListener('stateClick', (_, value) => {
      // value looks like { "properties.STE_NAME16": ["Victoria"] }
      const key = Object.keys(value || {})[0];
      const arr = key ? value[key] : null;
      const stateName = Array.isArray(arr) ? arr[0] : null;
      const abbr = stateName ? NAME_TO_STATE[stateName] : null;
      if (abbr) selectState(abbr, 'map');
    });
  } catch (e) { console.error('rent map failed', e); }

  // Initial selection
  selectState('NSW', 'init');
}

if (document.getElementById('rent-chart')) {
  initRentPanels();
}


const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.fade-in').forEach(section => {
  observer.observe(section);
});