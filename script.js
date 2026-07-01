let lastWeatherData = null;
let selectedDayIndex = null;

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("cityInput");
  const lastCity = localStorage.getItem("lastCity");

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      getWeather();
    }
  });

  if (lastCity) {
    input.value = lastCity;
    getWeather();
  }
});

async function getWeather() {
  const input = document.getElementById("cityInput");
  const city = input.value.trim();
  const weatherBox = document.getElementById("weatherBox");
  const homeScreen = document.getElementById("homeScreen");

  if (city === "") {
    weatherBox.innerHTML = `<p class="error">Bitte gib eine Stadt ein.</p>`;
    return;
  }

  localStorage.setItem("lastCity", city);
  homeScreen.classList.add("hidden");

  weatherBox.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Wetter für <strong>${city}</strong> wird geladen...</p>
    </div>
  `;

  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1&language=de&format=json`;
    const geoData = await (await fetch(geoUrl)).json();

    if (!geoData.results) {
      weatherBox.innerHTML = `<p class="error">Diese Stadt wurde nicht gefunden.</p>`;
      return;
    }

    const location = geoData.results[0];

    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}` +
      `&current=temperature_2m,apparent_temperature,wind_speed_10m,relative_humidity_2m,weather_code,pressure_msl` +
      `&hourly=temperature_2m,weather_code,precipitation_probability,relative_humidity_2m,wind_speed_10m` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max` +
      `&timezone=auto`;

    const weatherData = await (await fetch(weatherUrl)).json();

    lastWeatherData = { location, weatherData };
    selectedDayIndex = null;

    renderWeather();
  } catch (error) {
    weatherBox.innerHTML = `<p class="error">Fehler beim Laden der Wetterdaten.</p>`;
  }
}

function renderWeather() {
  const weatherBox = document.getElementById("weatherBox");
  const location = lastWeatherData.location;
  const weatherData = lastWeatherData.weatherData;
  const current = weatherData.current;
  const daily = weatherData.daily;

  weatherBox.innerHTML = `
    <section class="hero">
      <div>
        <h2 class="city">${location.name}</h2>
        <p class="country">${location.admin1 || ""} ${location.country}</p>
      </div>

      <div class="main-weather">
        <div class="icon">${getWeatherIcon(current.weather_code)}</div>
        <div>
          <div class="temp">${Math.round(current.temperature_2m)}°</div>
          <div class="desc">${getWeatherDescription(current.weather_code)}</div>
          <p class="minmax">
            H: ${Math.round(daily.temperature_2m_max[0])}° 
            T: ${Math.round(daily.temperature_2m_min[0])}°
          </p>
        </div>
      </div>
    </section>

    <section class="panel">
      <h3 class="panel-title">Aktuelle Details</h3>

      <div class="details">
        <div class="card"><span>Gefühlt</span><strong>${Math.round(current.apparent_temperature)}°</strong></div>
        <div class="card"><span>Luftfeuchtigkeit</span><strong>${current.relative_humidity_2m}%</strong></div>
        <div class="card"><span>Wind</span><strong>${current.wind_speed_10m} km/h</strong></div>
        <div class="card"><span>Luftdruck</span><strong>${Math.round(current.pressure_msl)} hPa</strong></div>
        <div class="card"><span>UV-Index</span><strong>${Math.round(daily.uv_index_max[0])}</strong></div>
        <div class="card"><span>Regen</span><strong>${daily.precipitation_probability_max[0]}%</strong></div>
        <div class="card full"><span>Sonne</span><strong>${formatTime(daily.sunrise[0])} – ${formatTime(daily.sunset[0])}</strong></div>
      </div>
    </section>

    <section class="panel hourly-section">
      <h3 class="panel-title">Nächste 24 Stunden</h3>
      <div class="hourly">${createNext24Hours(weatherData.hourly)}</div>
    </section>

    <section class="panel week-section">
      <h3 class="panel-title">7-Tage-Vorhersage</h3>
      <p class="hint">Tippe auf einen Tag, um den Stundenverlauf zu sehen.</p>
      <div class="weekly">${createWeeklyForecast(daily)}</div>
      <div id="dayDetails">${selectedDayIndex !== null ? createDayDetails(selectedDayIndex) : ""}</div>
    </section>
  `;
}

function createWeeklyForecast(daily) {
  let cards = "";

  for (let i = 0; i < daily.time.length; i++) {
    const date = new Date(daily.time[i]);
    const day = date.toLocaleDateString("de-DE", { weekday: "short" });
    const active = selectedDayIndex === i ? "active-day" : "";

    cards += `
      <button class="week-card ${active}" onclick="selectDay(${i})">
        <span>${i === 0 ? "Heute" : day}</span>
        <strong>${getWeatherIcon(daily.weather_code[i])}</strong>
        <p>${Math.round(daily.temperature_2m_max[i])}° / ${Math.round(daily.temperature_2m_min[i])}°</p>
        <small>${daily.precipitation_probability_max[i]}%</small>
      </button>
    `;
  }

  return cards;
}

function selectDay(index) {
  selectedDayIndex = selectedDayIndex === index ? null : index;
  renderWeather();
}

function createDayDetails(index) {
  const weatherData = lastWeatherData.weatherData;
  const daily = weatherData.daily;
  const hourly = weatherData.hourly;
  const selectedDate = daily.time[index];

  const date = new Date(selectedDate);

  const title = date.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  });

  const hours = [];

  for (let i = 0; i < hourly.time.length; i++) {
    if (hourly.time[i].startsWith(selectedDate)) {
      const hourDate = new Date(hourly.time[i]);

      hours.push(`
        <div class="day-hour">
          <span>${hourDate.getHours().toString().padStart(2, "0")}:00</span>
          <strong>${getWeatherIcon(hourly.weather_code[i])}</strong>
          <p>${Math.round(hourly.temperature_2m[i])}°</p>
          <small>Regen ${hourly.precipitation_probability[i]}%</small>
          <small>Wind ${Math.round(hourly.wind_speed_10m[i])} km/h</small>
        </div>
      `);
    }
  }

  return `
    <div class="day-details">
      <div class="day-details-header">
        <div>
          <h3>${title}</h3>
          <p>${getWeatherDescription(daily.weather_code[index])}</p>
        </div>
        <div class="day-big-icon">${getWeatherIcon(daily.weather_code[index])}</div>
      </div>

      <div class="day-summary">
        <div><span>Max</span><strong>${Math.round(daily.temperature_2m_max[index])}°</strong></div>
        <div><span>Min</span><strong>${Math.round(daily.temperature_2m_min[index])}°</strong></div>
        <div><span>Regen</span><strong>${daily.precipitation_probability_max[index]}%</strong></div>
        <div><span>UV</span><strong>${Math.round(daily.uv_index_max[index])}</strong></div>
      </div>

      <div class="sun-row">
        🌅 ${formatTime(daily.sunrise[index])} &nbsp;&nbsp; 🌇 ${formatTime(daily.sunset[index])}
      </div>

      <h4>Stundenverlauf</h4>
      <div class="day-hours">
        ${hours.join("")}
      </div>
    </div>
  `;
}

function createNext24Hours(hourly) {
  const now = new Date();
  const cards = [];

  for (let i = 0; i < hourly.time.length; i++) {
    const hourDate = new Date(hourly.time[i]);

    if (hourDate >= now && cards.length < 24) {
      const isToday = hourDate.getDate() === now.getDate();
      const label = isToday ? `${hourDate.getHours()}:00` : `Morgen ${hourDate.getHours()}:00`;

      cards.push(`
        <div class="hour-card">
          <span>${label}</span>
          <strong>${getWeatherIcon(hourly.weather_code[i])}</strong>
          <p>${Math.round(hourly.temperature_2m[i])}°</p>
          <small>Regen ${hourly.precipitation_probability[i]}%</small>
        </div>
      `);
    }
  }

  return cards.join("");
}

function searchCity(city) {
  document.getElementById("cityInput").value = city;
  getWeather();
}

function toggleTheme() {
  document.body.classList.toggle("light");
}

function toggleSettings() {
  document.getElementById("settingsBox").classList.toggle("hidden");
}

function getWeatherIcon(code) {
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";
  if (code <= 99) return "⛈️";
  return "🌤️";
}

function getWeatherDescription(code) {
  if (code === 0) return "Sonnig";
  if (code <= 3) return "Teilweise bewölkt";
  if (code <= 48) return "Nebel";
  if (code <= 67) return "Regen";
  if (code <= 77) return "Schnee";
  if (code <= 82) return "Regenschauer";
  if (code <= 99) return "Gewitter";
  return "Unbekannt";
}

function formatTime(timeString) {
  const date = new Date(timeString);
  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit"
  });
}