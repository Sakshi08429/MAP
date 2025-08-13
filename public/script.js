const countrySelect = document.getElementById('country');
const stateSelect = document.getElementById('state');
const citySelect = document.getElementById('city');
const infoDiv = document.getElementById('info');
const btnCurrentLocation = document.getElementById('btn-current-location');

let map, marker;


function initMap(lat = 28.584359, lon = 77.315493) {
  if (map) {
    map.setView([lat, lon], 13);
    if (marker) marker.setLatLng([lat, lon]);
    else marker = L.marker([lat, lon]).addTo(map);
  } else {
    map = L.map('map').setView([lat, lon], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    marker = L.marker([lat, lon]).addTo(map);
  }
}


function showLoading(target) {
  target.innerHTML = `<div class="shimmer"></div>`;
}
function clearLoading(target) {
  target.innerHTML = '';
}


async function loadCountries() {
  showLoading(countrySelect);
  try {
    const res = await fetch('/api/countries');
    const data = await res.json();
    clearLoading(countrySelect);

    countrySelect.innerHTML = `<option value="">Select Country</option>` +
      data.countries.map(c => `<option>${c}</option>`).join('');
    // countrySelect.disabled = false;
  } catch {
    countrySelect.innerHTML = `<option>Error loading countries</option>`;
  }
}

async function loadStates(country) {
  stateSelect.innerHTML = '';
  citySelect.innerHTML = '';
  if (!country) {
    stateSelect.disabled = true;
    citySelect.disabled = true;
    return;
  }
  showLoading(stateSelect);
  try {
    const res = await fetch('/api/states', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country }),
    });
    const data = await res.json();
    clearLoading(stateSelect);
    stateSelect.innerHTML = `<option value="">Select State</option>` +
      data.states.map(s => `<option>${s}</option>`).join('');
    stateSelect.disabled = false;
    citySelect.disabled = true;
  } catch {
    stateSelect.innerHTML = `<option>Error loading states</option>`;
  }
}


async function loadCities(country, state) {
  citySelect.innerHTML = '';
  if (!state) {
    citySelect.disabled = true;
    return;
  }
  showLoading(citySelect);
  try {
    const res = await fetch('/api/cities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country, state }),
    });
    const data = await res.json();
    clearLoading(citySelect);
    citySelect.innerHTML = `<option value="">Select City</option>` +
      data.cities.map(c => `<option>${c}</option>`).join('');
    citySelect.disabled = false;
  } catch {
    citySelect.innerHTML = `<option>Error loading cities</option>`;
  }
}


async function fetchPopulation(country, city) {
  try {
    const res = await fetch('https://countriesnow.space/api/v0.1/countries/population/cities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country, city }),
    });
    const data = await res.json();

    if (data.error || !Array.isArray(data.data?.populationCounts)) {
      return 'Unknown';
    }

    const popCounts = data.data.populationCounts;
    if (!popCounts.length) return 'Unknown';

    const latest = popCounts[popCounts.length - 1];
    return latest.value || 'Unknown';
  } catch {
    return 'Unknown';
  }
}


async function fetchLocationInfo(lat, lon, city = '') {
  infoDiv.innerHTML = `<p>Loading location info...</p>`;

  try {
    let countryName = countrySelect.value;

    
    if (!city || !countryName) {
      const geoRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
      );
      const geoData = await geoRes.json();

      if (!city) {
        city =
          geoData.city ||
          geoData.locality ||
          geoData.principalSubdivision ||
          'Unknown location';
      }

      if (!countryName) {
        countryName = geoData.countryName || '';
      }
    }

    initMap(lat, lon);

  
    const weatherRes = await fetch(`https://wttr.in/${lat},${lon}?format=j1`);
    const weatherData = await weatherRes.json();

    
    let population = 'Unknown';
    if (city !== 'Unknown location' && city && countryName) {
      population = await fetchPopulation(countryName, city);
    }

    const currentCondition = weatherData.current_condition[0];
    infoDiv.innerHTML = `
      <h3>${city}</h3>
      <p><strong>Country:</strong> ${countryName}</p>
      <p><strong>Temperature:</strong> ${currentCondition.temp_C} °C</p>
      <p><strong>Weather:</strong> ${currentCondition.weatherDesc[0].value}</p>
      <p><strong>Population:</strong> ${population}</p>
      
    `;
  } catch (err) {
    infoDiv.innerHTML = `<p>Error loading location info: ${err.message}</p>`;
  }
}


btnCurrentLocation.addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert('Geolocation not supported');
    return;
  }
  infoDiv.innerHTML = `<p>Getting your precise location...</p>`;
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      countrySelect.value = '';
      stateSelect.value = '';
      citySelect.value = '';

      fetchLocationInfo(lat, lon);
    },
    () => {
      infoDiv.innerHTML = '<p>Permission denied or unable to get location.</p>';
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
});



countrySelect.addEventListener('change', () => {
  const country = countrySelect.value;
  loadStates(country);
  citySelect.innerHTML = '';
  citySelect.disabled = true;
  infoDiv.innerHTML = '';
  if (!country) {
    stateSelect.innerHTML = '';
    stateSelect.disabled = true;
  }
});


stateSelect.addEventListener('change', () => {
  const country = countrySelect.value;
  const state = stateSelect.value;
  loadCities(country, state);
  infoDiv.innerHTML = '';
  citySelect.disabled = true;
});

citySelect.addEventListener('change', () => {
  const city = citySelect.value;
  if (!city) return;

  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`)
    .then(res => res.json())
    .then(data => {
      if (data.length === 0) {
        infoDiv.innerHTML = '<p>Location not found</p>';
        return;
      }
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      fetchLocationInfo(lat, lon, city);
    })
    .catch(() => {
      infoDiv.innerHTML = '<p>Error fetching location coordinates</p>';
    });
});


loadCountries();
initMap();


if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      if (!citySelect.value) {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        fetchLocationInfo(lat, lon);
      }
    },
    () => {},
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}
