async function getWeather() {
  const city = document.getElementById("cityInput").value;
  const weatherBox = document.getElementById("weatherBox");

  if (city === "") {
    weatherBox.innerHTML = "<p>Bitte gib eine Stadt ein.</p>";
    return;
  }

  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1&language=de&format=json`;
    const geoResponse = await fetch(geoUrl);
    const geoData = await geoResponse.json();

    if (!geoData.results) {
      weatherBox.innerHTML = "<p>Stadt wurde nicht gefunden.</p>";
      return;
    }

    const location = geoData.results[0];
    const latitude = location.latitude;
    const longitude = location.longitude;

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m,relative_humidity_2m`;
    const weatherResponse = await fetch(weatherUrl);
    const weatherData = await weatherResponse.json();

    const temperature = weatherData.current.temperature_2m;
    const wind = weatherData.current.wind_speed_10m;
    const humidity = weatherData.current.relative_humidity_2m;

    weatherBox.innerHTML = `
      <h2>${location.name}, ${location.country}</h2>
      <p>🌡️ Temperatur: ${temperature} °C</p>
      <p>💨 Wind: ${wind} km/h</p>
      <p>💧 Luftfeuchtigkeit: ${humidity}%</p>
    `;

  } catch (error) {
    weatherBox.innerHTML = "<p>Fehler beim Laden der Wetterdaten.</p>";
  }
}