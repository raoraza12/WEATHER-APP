/* =========================================================
   WEATHER 3D • ATMOSPHERIC BENTO LOGIC & 3D SIMULATION
   ========================================================= */

const API_KEY = "1a2d648d4d92465cadb123919241911";
let currentForecastData = null;
let isCelsius = true;

// DOM Selectors
const cityInput = document.querySelector("#city-input");
const searchBtn = document.querySelector("#search-btn");
const errorToast = document.querySelector("#error-toast");
const errorMessage = document.querySelector("#error-message");
const quickChips = document.querySelectorAll(".quick-chip");
const unitToggle = document.querySelector("#unit-toggle");
const unitC = document.querySelector("#unit-c");
const unitF = document.querySelector("#unit-f");

// Bento Hero Elements
const locRegion = document.querySelector("#loc-region");
const locCity = document.querySelector("#loc-city");
const locTime = document.querySelector("#loc-time");
const weatherIcon = document.querySelector("#weather-icon");
const weatherCondition = document.querySelector("#weather-condition");
const tempNumber = document.querySelector("#temp-number");
const feelsVal = document.querySelector("#feels-val");
const tempHigh = document.querySelector("#temp-high");
const tempLow = document.querySelector("#temp-low");
const skySummary = document.querySelector("#sky-summary");

// Hourly Track
const hourlyTrack = document.querySelector("#hourly-track");

// Sun Arc Elements
const sunMarker = document.querySelector("#sun-marker");
const sunriseTime = document.querySelector("#sunrise-time");
const sunsetTime = document.querySelector("#sunset-time");

// Compass & Metrics
const compassNeedle = document.querySelector("#compass-needle");
const windSpeedVal = document.querySelector("#wind-speed-val");
const windDirVal = document.querySelector("#wind-dir-val");
const windGustVal = document.querySelector("#wind-gust-val");
const uvScore = document.querySelector("#uv-score");
const uvFill = document.querySelector("#uv-fill");
const uvAdvice = document.querySelector("#uv-advice");
const humidityScore = document.querySelector("#humidity-score");
const humidityFill = document.querySelector("#humidity-fill");
const humidityAdvice = document.querySelector("#humidity-advice");
const pressureVal = document.querySelector("#pressure-val");
const visVal = document.querySelector("#vis-val");

/* =========================================================
   1. API FETCHING (FORECAST + ASTRONOMY)
   ========================================================= */
async function fetchWeather(city) {
  if (!city || !city.trim()) {
    showError("Please enter a city name!");
    return;
  }

  hideError();
  setLoadingState(true);

  try {
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${encodeURIComponent(city.trim())}&days=3&aqi=yes`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      showError(data.error.message || "Location not found.");
      setLoadingState(false);
      return;
    }

    currentForecastData = data;
    renderFullWeather(data);
    update3DWeatherSky(data.current.condition.text.toLowerCase(), data.current.is_day);
  } catch (err) {
    console.error("Fetch error:", err);
    showError("Network error. Please check your internet!");
  } finally {
    setLoadingState(false);
  }
}

function renderFullWeather(data) {
  const { location, current, forecast } = data;
  const todayForecast = forecast.forecastday[0];

  // 1. Hero Data
  locRegion.textContent = `${location.region ? location.region + ", " : ""}${location.country}`;
  locCity.textContent = location.name;
  locTime.textContent = `Local Time: ${location.localtime.split(" ")[1] || location.localtime}`;

  weatherCondition.textContent = current.condition.text;
  let iconUrl = current.condition.icon;
  if (iconUrl.startsWith("//")) iconUrl = "https:" + iconUrl;
  weatherIcon.src = iconUrl;
  weatherIcon.alt = current.condition.text;

  skySummary.textContent = `${current.condition.text} with ${current.wind_kph} km/h wind and ${current.humidity}% humidity.`;

  // Temperature values
  updateTemperatures();

  // 2. Render 24-Hour Timeline
  renderHourlyTimeline(todayForecast.hour, location.localtime);

  // 3. Sun Path Arc
  if (todayForecast.astro) {
    sunriseTime.textContent = todayForecast.astro.sunrise;
    sunsetTime.textContent = todayForecast.astro.sunset;
    calculateSunPosition(location.localtime, todayForecast.astro.sunrise, todayForecast.astro.sunset);
  }

  // 4. Wind Compass
  compassNeedle.style.transform = `rotate(${current.wind_degree}deg)`;
  windSpeedVal.innerHTML = `${current.wind_kph} <span>km/h</span>`;
  windDirVal.textContent = `${current.wind_dir} (${current.wind_degree}°)`;
  windGustVal.textContent = `Gusts up to ${current.gust_kph || current.wind_kph * 1.3} km/h`;

  // 5. UV & Humidity
  uvScore.textContent = current.uv;
  uvFill.style.width = `${Math.min(current.uv * 10, 100)}%`;
  uvAdvice.textContent = current.uv > 6 ? "High UV • Seek shade & SPF" : (current.uv > 2 ? "Moderate UV • Sun protection advised" : "Low UV • Safe exposure");

  humidityScore.textContent = `${current.humidity}%`;
  humidityFill.style.width = `${current.humidity}%`;
  humidityAdvice.textContent = `Dew point ${isCelsius ? current.dewpoint_c + "°C" : current.dewpoint_f + "°F"}`;

  // 6. Barometer & Visibility
  pressureVal.textContent = current.pressure_mb;
  visVal.textContent = `${current.vis_km} km`;
}

function updateTemperatures() {
  if (!currentForecastData) return;
  const current = currentForecastData.current;
  const todayDay = currentForecastData.forecast.forecastday[0].day;

  const curTemp = isCelsius ? Math.round(current.temp_c) : Math.round(current.temp_f);
  const feels = isCelsius ? `${Math.round(current.feelslike_c)}°C` : `${Math.round(current.feelslike_f)}°F`;
  const maxTemp = isCelsius ? `${Math.round(todayDay.maxtemp_c)}°` : `${Math.round(todayDay.maxtemp_f)}°`;
  const minTemp = isCelsius ? `${Math.round(todayDay.mintemp_c)}°` : `${Math.round(todayDay.mintemp_f)}°`;

  tempNumber.textContent = curTemp;
  feelsVal.textContent = feels;
  tempHigh.textContent = maxTemp;
  tempLow.textContent = minTemp;

  if (isCelsius) {
    unitC.className = "active-unit";
    unitF.className = "";
  } else {
    unitC.className = "";
    unitF.className = "active-unit";
  }

  // Re-render hourly numbers
  if (currentForecastData.forecast) {
    const todayForecast = currentForecastData.forecast.forecastday[0];
    renderHourlyTimeline(todayForecast.hour, currentForecastData.location.localtime);
  }
}

function renderHourlyTimeline(hours, localTimeStr) {
  if (!hours || !hours.length) return;
  hourlyTrack.innerHTML = "";

  const currentHour = parseInt(localTimeStr.split(" ")[1]?.split(":")[0]) || 12;

  // Show 12 hours starting from current hour
  const displayHours = hours.slice(Math.max(0, currentHour - 1), currentHour + 11);

  displayHours.forEach(h => {
    const timeLabel = h.time.split(" ")[1];
    let icon = h.condition.icon;
    if (icon.startsWith("//")) icon = "https:" + icon;

    const temp = isCelsius ? `${Math.round(h.temp_c)}°` : `${Math.round(h.temp_f)}°`;
    const pop = h.chance_of_rain > 0 ? `${h.chance_of_rain}%` : "";

    const item = document.createElement("div");
    item.className = "hourly-item";
    item.innerHTML = `
      <span class="hourly-time">${timeLabel}</span>
      <img src="${icon}" alt="${h.condition.text}" class="hourly-icon">
      <span class="hourly-temp">${temp}</span>
      <span class="hourly-pop">${pop}</span>
    `;
    hourlyTrack.appendChild(item);
  });
}

function calculateSunPosition(localTimeStr, sunriseStr, sunsetStr) {
  const hour = parseInt(localTimeStr.split(" ")[1]?.split(":")[0]) || 12;
  const progress = Math.max(0.05, Math.min(0.95, (hour - 6) / 12));

  const x = 20 + progress * 200;
  const normalized = (progress - 0.5) * 2;
  const y = 110 - (1 - normalized * normalized) * 100;

  sunMarker.setAttribute("cx", x);
  sunMarker.setAttribute("cy", Math.max(12, y));
}

function setLoadingState(isLoading) {
  if (isLoading) {
    searchBtn.disabled = true;
    searchBtn.innerHTML = `<span>Searching...</span>`;
  } else {
    searchBtn.disabled = false;
    searchBtn.innerHTML = `<span>Search</span><i data-lucide="arrow-up-right" class="btn-arrow"></i>`;
    if (window.lucide) lucide.createIcons();
  }
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorToast.classList.remove("hidden");
  setTimeout(hideError, 4000);
}

function hideError() {
  errorToast.classList.add("hidden");
}

/* =========================================================
   2. 3D WEATHER PHYSICS SIMULATION (Three.js)
   ========================================================= */
let scene, camera, renderer, weatherParticles;
let currentWeatherType = "clear";

function init3DWeatherSky() {
  const canvas = document.querySelector("#weather-sky-canvas");
  if (!canvas || !window.THREE) return;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.z = 300;

  renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  setupWeatherParticles("clear");

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  function animate() {
    requestAnimationFrame(animate);

    if (weatherParticles) {
      if (currentWeatherType === "rain") {
        const positions = weatherParticles.geometry.attributes.position.array;
        for (let i = 1; i < positions.length; i += 3) {
          positions[i] -= 8;
          if (positions[i] < -250) positions[i] = 250;
        }
        weatherParticles.geometry.attributes.position.needsUpdate = true;
      } else if (currentWeatherType === "snow") {
        const positions = weatherParticles.geometry.attributes.position.array;
        for (let i = 1; i < positions.length; i += 3) {
          positions[i] -= 1.5;
          positions[i - 1] += Math.sin(positions[i] * 0.05) * 0.3;
          if (positions[i] < -250) positions[i] = 250;
        }
        weatherParticles.geometry.attributes.position.needsUpdate = true;
      } else {
        weatherParticles.rotation.y += 0.001;
        weatherParticles.rotation.x += 0.0005;
      }
    }

    renderer.render(scene, camera);
  }

  animate();
}

function setupWeatherParticles(type) {
  if (weatherParticles) scene.remove(weatherParticles);
  currentWeatherType = type;

  let count = 250;
  let color = 0xfbbf24;
  let size = 3;

  if (type === "rain") {
    count = 500;
    color = 0x38bdf8;
    size = 2.5;
  } else if (type === "cloud") {
    count = 180;
    color = 0x94a3b8;
    size = 5;
  } else if (type === "snow") {
    count = 350;
    color = 0xffffff;
    size = 3.5;
  }

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 700;
    positions[i + 1] = (Math.random() - 0.5) * 500;
    positions[i + 2] = (Math.random() - 0.5) * 400;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: color,
    size: size,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending
  });

  weatherParticles = new THREE.Points(geometry, material);
  scene.add(weatherParticles);
}

function update3DWeatherSky(conditionText, isDay) {
  if (conditionText.includes("rain") || conditionText.includes("drizzle") || conditionText.includes("thunder")) {
    setupWeatherParticles("rain");
  } else if (conditionText.includes("snow") || conditionText.includes("blizzard") || conditionText.includes("ice")) {
    setupWeatherParticles("snow");
  } else if (conditionText.includes("cloud") || conditionText.includes("overcast") || conditionText.includes("fog")) {
    setupWeatherParticles("cloud");
  } else {
    setupWeatherParticles("clear");
  }
}

/* =========================================================
   3. 3D CARD TILT FOR ALL BENTO CARDS
   ========================================================= */
function setupBentoTilt() {
  const cards = document.querySelectorAll(".tilt-card");

  cards.forEach(card => {
    const glare = card.querySelector(".card-glare");

    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = -((y - centerY) / centerY) * 8;
      const rotateY = ((x - centerX) / centerX) * 8;

      card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;

      if (glare) {
        glare.style.opacity = "1";
        glare.style.background = `radial-gradient(circle at ${(x / rect.width) * 100}% ${(y / rect.height) * 100}%, rgba(255, 255, 255, 0.18) 0%, transparent 60%)`;
      }
    });

    card.addEventListener("mouseleave", () => {
      if (glare) glare.style.opacity = "0";
      card.style.transform = `perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    });
  });
}

/* =========================================================
   4. INIT
   ========================================================= */
function init() {
  if (window.lucide) lucide.createIcons();

  searchBtn.addEventListener("click", () => fetchWeather(cityInput.value));
  cityInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") fetchWeather(cityInput.value);
  });

  quickChips.forEach(chip => {
    chip.addEventListener("click", () => {
      const city = chip.getAttribute("data-city");
      cityInput.value = city;
      fetchWeather(city);
    });
  });

  unitToggle.addEventListener("click", () => {
    isCelsius = !isCelsius;
    updateTemperatures();
  });

  setupBentoTilt();
  init3DWeatherSky();
  fetchWeather("Karachi");
}

document.addEventListener("DOMContentLoaded", init);