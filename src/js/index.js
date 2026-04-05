// ===== Weather App JavaScript =====

// OpenWeatherMap API Configuration
const API_KEY = '77cf939c1d2c714a8bded364de794833';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const GEO_URL = 'https://api.openweathermap.org/geo/1.0';
const AIR_QUALITY_URL = 'https://api.openweathermap.org/data/2.5/air_pollution';

// Temperature unit state
let currentUnit = localStorage.getItem('weatherUnit') || 'imperial'; // 'imperial' = Fahrenheit, 'metric' = Celsius

// Retry configuration
const RETRY_CONFIG = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000  // 10 seconds
};

// Weather icon SVGs
const weatherIcons = {
    sun: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
    `,
    cloud: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
        </svg>
    `,
    rain: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="16" y1="13" x2="16" y2="21"></line>
            <line x1="8" y1="13" x2="8" y2="21"></line>
            <line x1="12" y1="15" x2="12" y2="23"></line>
            <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"></path>
        </svg>
    `,
    'partly-cloudy': `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
            <circle cx="20" cy="8" r="2"></circle>
        </svg>
    `
};

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    updateCurrentDate();
    setupEventListeners();
    animateOnScroll();
    initTemperatureToggle();
    initRecentSearches();
    // Try geolocation first, fall back to saved city or default
    loadWeatherWithGeolocation();
});

// Update current date
function updateCurrentDate() {
    const dateElement = document.getElementById('currentDate');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date().toLocaleDateString('en-US', options);
    dateElement.textContent = today;
}

// Load weather with geolocation support
function loadWeatherWithGeolocation() {
    // First check if we have a saved last viewed city
    const lastCity = localStorage.getItem('lastViewedCity');

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Success - fetch weather for current location
                showSkeletonLoading();
                fetchWeatherByCoords(position.coords.latitude, position.coords.longitude)
                    .then(data => {
                        updateWeatherDisplay(data);
                        updateForecastDisplay(data.forecast);
                        updateHourlyForecast(data.forecast);
                        updateAirQualityDisplay(data.airQuality);
                        hideSkeletonLoading();
                        showNotification(`Weather loaded for your location: ${data.location.name}`, 'success');
                    })
                    .catch(error => {
                        console.log('Geolocation weather failed:', error.message);
                        if (lastCity) {
                            loadSavedCity(lastCity);
                        } else {
                            loadDefaultWeather();
                        }
                    });
            },
            (error) => {
                // Permission denied or error - use saved city or default
                console.log('Geolocation denied or unavailable');
                if (lastCity) {
                    loadSavedCity(lastCity);
                } else {
                    loadDefaultWeather();
                }
            },
            { timeout: 10000, enableHighAccuracy: false }
        );
    } else {
        // Geolocation not supported
        if (lastCity) {
            loadSavedCity(lastCity);
        } else {
            loadDefaultWeather();
        }
    }
}

// Load saved city from localStorage
async function loadSavedCity(city) {
    showSkeletonLoading();
    try {
        const data = await fetchWithRetry(() => fetchWeatherData(city));
        updateWeatherDisplay(data);
        updateForecastDisplay(data.forecast);
        updateHourlyForecast(data.forecast);
        updateAirQualityDisplay(data.airQuality);
        hideSkeletonLoading();
    } catch (error) {
        hideSkeletonLoading();
        console.log('Could not load saved city:', error.message);
        loadDefaultWeather();
    }
}

// Fetch UV Index data
async function fetchUVIndex(lat, lon) {
    try {
        const response = await fetchWithRetry(() =>
            fetch(`${BASE_URL}/uvi?lat=${lat}&lon=${lon}&appid=${API_KEY}`)
        );
        const data = await response.json();
        return data.value;
    } catch (error) {
        console.log('UV Index not available:', error.message);
        return null;
    }
}

// Fetch Air Quality data
async function fetchAirQuality(lat, lon) {
    try {
        const response = await fetchWithRetry(() =>
            fetch(`${AIR_QUALITY_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}`)
        );
        const data = await response.json();
        return data.list[0]; // Current air quality data
    } catch (error) {
        console.log('Air quality data not available:', error.message);
        return null;
    }
}

// Get Air Quality Index info
function getAQIInfo(aqi) {
    const levels = {
        1: { label: 'Good', color: '#10b981', description: 'Air quality is satisfactory' },
        2: { label: 'Fair', color: '#84cc16', description: 'Acceptable, moderate concern for some' },
        3: { label: 'Moderate', color: '#f59e0b', description: 'Sensitive groups may experience effects' },
        4: { label: 'Poor', color: '#f97316', description: 'Health effects possible for everyone' },
        5: { label: 'Very Poor', color: '#ef4444', description: 'Health alert: everyone may experience effects' }
    };
    return levels[aqi] || { label: 'Unknown', color: '#64748b', description: 'Data unavailable' };
}

// Get UV Index description and color
function getUVInfo(value) {
    if (value === null || value === undefined) return { label: 'N/A', color: 'var(--text-muted)' };
    if (value <= 2) return { label: 'Low', color: '#10b981' };
    if (value <= 5) return { label: 'Moderate', color: '#f59e0b' };
    if (value <= 7) return { label: 'High', color: '#f97316' };
    if (value <= 10) return { label: 'Very High', color: '#ef4444' };
    return { label: 'Extreme', color: '#8b5cf6' };
}

// Fetch with retry mechanism
async function fetchWithRetry(fetchFn, retryCount = 0) {
    try {
        return await fetchFn();
    } catch (error) {
        if (retryCount >= RETRY_CONFIG.maxRetries) {
            throw new Error(`Failed after ${RETRY_CONFIG.maxRetries} retries: ${error.message}`);
        }

        // Calculate exponential backoff delay
        const delay = Math.min(
            RETRY_CONFIG.baseDelay * Math.pow(2, retryCount),
            RETRY_CONFIG.maxDelay
        );

        console.log(`Retry ${retryCount + 1}/${RETRY_CONFIG.maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithRetry(fetchFn, retryCount + 1);
    }
}

// Fetch weather data by coordinates
async function fetchWeatherByCoords(lat, lon) {
    try {
        // Fetch current weather
        const weatherResponse = await fetchWithRetry(() =>
            fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}`)
        );
        const weatherData = await weatherResponse.json();

        // Fetch 5-day forecast
        const forecastResponse = await fetchWithRetry(() =>
            fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}`)
        );
        const forecastData = await forecastResponse.json();

        // Fetch UV Index
        const uvIndex = await fetchUVIndex(lat, lon);

        // Fetch Air Quality
        const airQuality = await fetchAirQuality(lat, lon);

        // Get location name from reverse geocoding
        const reverseGeoResponse = await fetchWithRetry(() =>
            fetch(`${GEO_URL}/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`)
        );
        const reverseGeoData = await reverseGeoResponse.json();
        const locationName = reverseGeoData[0]?.name || 'Unknown Location';
        const country = reverseGeoData[0]?.country || '';

        return {
            current: weatherData,
            forecast: forecastData,
            uvIndex: uvIndex,
            airQuality: airQuality,
            location: { name: locationName, country }
        };
    } catch (error) {
        console.error('Error fetching weather by coordinates:', error);
        throw error;
    }
}

// Initialize forecast with default city (New York)
async function loadDefaultWeather() {
    showSkeletonLoading();
    try {
        const data = await fetchWithRetry(() => fetchWeatherData('New York'));
        updateWeatherDisplay(data);
        updateForecastDisplay(data.forecast);
        updateHourlyForecast(data.forecast);
        updateAirQualityDisplay(data.airQuality);
        hideSkeletonLoading();
    } catch (error) {
        hideSkeletonLoading();
        console.log('Could not load default weather:', error.message);
        if (error.message.includes('API key')) {
            showNotification(error.message, 'warning');
        }
        generateFallbackForecast();
    }
}

// Generate fallback forecast when API fails
function generateFallbackForecast() {
    const forecastGrid = document.getElementById('forecastGrid');
    if (!forecastGrid || forecastGrid.children.length > 0) return;

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date().getDay();
    const adjustedDays = [...days.slice(today - 1), ...days.slice(0, today - 1)];

    adjustedDays.forEach((day) => {
        const high = 65 + Math.floor(Math.random() * 20);
        const low = high - 15 - Math.floor(Math.random() * 10);
        const conditions = ['sun', 'cloud', 'partly-cloudy', 'rain'];
        const condition = conditions[Math.floor(Math.random() * conditions.length)];

        const forecastCard = document.createElement('div');
        forecastCard.className = 'forecast-card';
        forecastCard.innerHTML = `
            <div class="forecast-day">${day}</div>
            <div class="forecast-icon">${weatherIcons[condition]}</div>
            <div class="forecast-temps">
                <span class="forecast-high">${high}°</span>
                <span class="forecast-low">${low}°</span>
            </div>
        `;
        forecastGrid.appendChild(forecastCard);
    });
}

// Setup event listeners
function setupEventListeners() {
    const citySearch = document.getElementById('citySearch');
    const searchBtn = document.getElementById('searchBtn');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');

    // Search functionality
    searchBtn.addEventListener('click', handleSearch);
    citySearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // Recent searches dropdown
    citySearch.addEventListener('focus', showRecentSearches);
    citySearch.addEventListener('input', () => {
        if (!citySearch.value.trim()) {
            showRecentSearches();
        } else {
            hideRecentSearches();
        }
    });

    // Hide dropdown when clicking outside (but not when scrolling)
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.hero-search') && !e.target.closest('.recent-searches-dropdown')) {
            hideRecentSearches();
        }
    });

    // Mobile menu toggle
    mobileMenuBtn.addEventListener('click', toggleMobileMenu);

    // Code copy button
    const codeCopyBtn = document.getElementById('codeCopyBtn');
    if (codeCopyBtn) {
        codeCopyBtn.addEventListener('click', () => {
            const code = document.querySelector('.docs-code-block code');
            if (code) {
                navigator.clipboard.writeText(code.textContent).then(() => {
                    codeCopyBtn.textContent = 'Copied!';
                    codeCopyBtn.style.background = 'var(--success)';
                    codeCopyBtn.style.color = 'white';
                    codeCopyBtn.style.borderColor = 'var(--success)';
                    setTimeout(() => {
                        codeCopyBtn.textContent = 'Copy';
                        codeCopyBtn.style.background = '';
                        codeCopyBtn.style.color = '';
                        codeCopyBtn.style.borderColor = '';
                    }, 2000);
                });
            }
        });
    }

    // Smooth scroll for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Recent searches functions
function getRecentSearches() {
    const saved = localStorage.getItem('recentSearches');
    return saved ? JSON.parse(saved) : [];
}

function addRecentSearch(city) {
    if (!city) return;
    const recent = getRecentSearches();
    // Remove if already exists
    const filtered = recent.filter(c => c.toLowerCase() !== city.toLowerCase());
    // Add to beginning
    filtered.unshift(city);
    // Keep only last 5
    const updated = filtered.slice(0, 5);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
}

function showRecentSearches() {
    const recent = getRecentSearches();
    if (recent.length === 0) {
        console.log('No recent searches to show');
        return;
    }

    let dropdown = document.getElementById('recentSearchesDropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'recentSearchesDropdown';
        dropdown.className = 'recent-searches-dropdown';
        document.querySelector('.search-box').appendChild(dropdown);
    }

    dropdown.innerHTML = `
        <div class="recent-searches-header">Recent Searches</div>
        ${recent.map(city => `
            <div class="recent-search-item" data-city="${city}">
                <svg class="recent-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>${city}</span>
                <button class="remove-recent" data-city="${city}" title="Remove">×</button>
            </div>
        `).join('')}
    `;

    dropdown.style.display = 'block';

    // Add click handlers
    dropdown.querySelectorAll('.recent-search-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('remove-recent')) {
                const city = item.getAttribute('data-city');
                document.getElementById('citySearch').value = city;
                hideRecentSearches();
                handleSearch();
            }
        });
    });

    dropdown.querySelectorAll('.remove-recent').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const city = btn.getAttribute('data-city');
            removeRecentSearch(city);
            showRecentSearches();
        });
    });
}

function hideRecentSearches() {
    const dropdown = document.getElementById('recentSearchesDropdown');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
}

function removeRecentSearch(city) {
    const recent = getRecentSearches();
    const updated = recent.filter(c => c.toLowerCase() !== city.toLowerCase());
    localStorage.setItem('recentSearches', JSON.stringify(updated));
}

function initRecentSearches() {
    // Recent searches dropdown is initialized in setupEventListeners
}

// Mock weather data for fallback when API is unavailable
const mockWeatherData = {
    current: {
        main: { temp: 72, humidity: 45, pressure: 1015, feels_like: 75 },
        weather: [{ main: 'Sunny', icon: '01d' }],
        wind: { speed: 8 }
    },
    forecast: {
        list: Array.from({ length: 40 }, (_, i) => ({
            dt: Date.now() / 1000 + i * 10800,
            main: { temp_max: 70 + Math.random() * 15, temp_min: 55 + Math.random() * 10 },
            weather: [{ icon: ['01d', '02d', '03d', '10d'][Math.floor(Math.random() * 4)] }]
        }))
    }
};

// Fetch weather data from OpenWeatherMap API
async function fetchWeatherData(city) {
    try {
        // First, get coordinates for the city
        const geoResponse = await fetchWithRetry(() =>
            fetch(`${GEO_URL}/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`)
        );
        const geoData = await geoResponse.json();

        // Check for API errors
        if (geoData.cod === 401 || (typeof geoData === 'object' && geoData.message?.includes('Invalid API key'))) {
            throw new Error('API_KEY_INVALID');
        }

        if (!Array.isArray(geoData) || geoData.length === 0) {
            throw new Error('City not found');
        }

        const { lat, lon, name, country } = geoData[0];

        // Fetch current weather
        const weatherResponse = await fetchWithRetry(() =>
            fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}`)
        );
        const weatherData = await weatherResponse.json();

        // Fetch 5-day forecast
        const forecastResponse = await fetchWithRetry(() =>
            fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}`)
        );
        const forecastData = await forecastResponse.json();

        // Fetch UV Index
        const uvIndex = await fetchUVIndex(lat, lon);

        // Fetch Air Quality
        const airQuality = await fetchAirQuality(lat, lon);

        return {
            current: weatherData,
            forecast: forecastData,
            uvIndex: uvIndex,
            airQuality: airQuality,
            location: { name, country }
        };
    } catch (error) {
        console.error('Error fetching weather data:', error);
        if (error.message === 'API_KEY_INVALID') {
            throw new Error('Your OpenWeatherMap API key is not active yet. Please wait up to 2 hours after creating it, or check your account at openweathermap.org');
        }
        throw error;
    }
}

// Map OpenWeatherMap icon codes to our icons
function mapWeatherIcon(iconCode) {
    const iconMap = {
        '01d': 'sun', '01n': 'sun',
        '02d': 'partly-cloudy', '02n': 'partly-cloudy',
        '03d': 'cloud', '03n': 'cloud',
        '04d': 'cloud', '04n': 'cloud',
        '09d': 'rain', '09n': 'rain',
        '10d': 'rain', '10n': 'rain',
        '11d': 'rain', '11n': 'rain',
        '13d': 'cloud', '13n': 'cloud',
        '50d': 'cloud', '50n': 'cloud'
    };
    return iconMap[iconCode] || 'sun';
}

// Handle search
async function handleSearch() {
    const citySearch = document.getElementById('citySearch');
    const searchTerm = citySearch.value.trim();

    if (!searchTerm) {
        showNotification('Please enter a city name', 'warning');
        return;
    }

    showSkeletonLoading();

    try {
        const data = await fetchWithRetry(() => fetchWeatherData(searchTerm));

        updateWeatherDisplay(data);
        updateForecastDisplay(data.forecast);
        updateHourlyForecast(data.forecast);
        updateAirQualityDisplay(data.airQuality);

        // Save to recent searches and last viewed city
        addRecentSearch(data.location.name);
        localStorage.setItem('lastViewedCity', data.location.name);

        hideSkeletonLoading();
        showNotification(`Weather updated for ${data.location.name}, ${data.location.country}`, 'success');
        document.getElementById('weatherDisplay').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        hideSkeletonLoading();
        if (error.message.includes('API key')) {
            showNotification(error.message, 'warning');
        } else if (error.message === 'City not found') {
            showNotification('City not found. Please try again.', 'warning');
        } else {
            showNotification('Failed to fetch weather data. Please try again.', 'warning');
        }
    }
}

// Initialize temperature unit toggle
function initTemperatureToggle() {
    const toggleBtn = document.getElementById('unitToggle');
    if (!toggleBtn) return;

    updateToggleUI(toggleBtn);

    toggleBtn.addEventListener('click', () => {
        currentUnit = currentUnit === 'imperial' ? 'metric' : 'imperial';
        localStorage.setItem('weatherUnit', currentUnit);
        updateToggleUI(toggleBtn);

        // Refresh current weather data with new units
        const cityName = document.getElementById('cityName').textContent;
        if (cityName) {
            const city = cityName.split(',')[0].trim();
            if (city) {
                showSkeletonLoading();
                fetchWithRetry(() => fetchWeatherData(city))
                    .then(data => {
                        updateWeatherDisplay(data);
                        updateForecastDisplay(data.forecast);
                        updateHourlyForecast(data.forecast);
                        hideSkeletonLoading();
                        showNotification(`Temperature unit changed to ${currentUnit === 'imperial' ? 'Fahrenheit' : 'Celsius'}`, 'success');
                    })
                    .catch(() => {
                        hideSkeletonLoading();
                        showNotification('Failed to refresh weather data', 'warning');
                    });
            }
        }
    });
}

// Update toggle button UI
function updateToggleUI(toggleBtn) {
    const unitLabel = toggleBtn.querySelector('.unit-label') || toggleBtn;
    const isFahrenheit = currentUnit === 'imperial';
    unitLabel.textContent = isFahrenheit ? '°F' : '°C';
    toggleBtn.classList.toggle('fahrenheit', isFahrenheit);
    toggleBtn.classList.toggle('celsius', !isFahrenheit);
}

// Loading skeleton functions
function showSkeletonLoading() {
    const forecastGrid = document.getElementById('forecastGrid');
    const hourlyForecast = document.getElementById('hourlyForecast');
    const airQualityData = document.getElementById('airQualityData');

    // Only show skeleton for sections that exist and are empty
    if (forecastGrid && forecastGrid.children.length === 0) {
        forecastGrid.innerHTML = getForecastSkeletonHTML();
    }

    if (hourlyForecast && hourlyForecast.children.length === 0) {
        hourlyForecast.innerHTML = getHourlySkeletonHTML();
    }

    if (airQualityData && airQualityData.children.length === 0) {
        airQualityData.innerHTML = getAQISkeletonHTML();
    }
}

function hideSkeletonLoading() {
    // Skeletons are automatically replaced when data is loaded
    // No additional action needed
}

function getForecastSkeletonHTML() {
    return Array(7).fill('<div class="skeleton-forecast-card"><div class="skeleton-line" style="width: 40px; height: 16px;"></div><div class="skeleton-circle" style="width: 40px; height: 40px; margin: 12px auto;"></div><div class="skeleton-line" style="width: 50px; height: 20px;"></div><div class="skeleton-line" style="width: 40px; height: 14px; margin-top: 4px;"></div></div>').join('');
}

function getHourlySkeletonHTML() {
    return Array(8).fill('<div class="skeleton-hourly-item"><div class="skeleton-line" style="width: 40px; height: 14px;"></div><div class="skeleton-circle" style="width: 32px; height: 32px; margin: 8px 0;"></div><div class="skeleton-line" style="width: 40px; height: 20px;"></div></div>').join('');
}

function getAQISkeletonHTML() {
    return '<div class="skeleton-aqi"><div class="skeleton-line" style="width: 80px; height: 40px;"></div><div><div class="skeleton-line" style="width: 100px; height: 20px;"></div><div class="skeleton-line" style="width: 150px; height: 14px; margin-top: 8px;"></div></div></div>';
}

// Update weather display with API data
function updateWeatherDisplay(data) {
    const { current, location, uvIndex } = data;

    document.getElementById('cityName').textContent = `${location.name}, ${location.country}`;
    document.getElementById('temperature').textContent = Math.round(current.main.temp);
    document.getElementById('weatherDesc').textContent = current.weather[0].main;
    document.getElementById('humidity').textContent = `${current.main.humidity}%`;
    document.getElementById('windSpeed').textContent = `${Math.round(current.wind.speed)} ${currentUnit === 'imperial' ? 'mph' : 'm/s'}`;
    document.getElementById('pressure').textContent = `${current.main.pressure} hPa`;

    // Update UV Index with actual data and color indicator
    const uvInfo = getUVInfo(uvIndex);
    const uvElement = document.getElementById('uvIndex');
    const uvLabelElement = document.getElementById('uvLabel');

    if (uvIndex !== null && uvIndex !== undefined) {
        uvElement.textContent = Math.round(uvIndex);
        uvElement.style.color = uvInfo.color;
        if (uvLabelElement) {
            uvLabelElement.textContent = uvInfo.label;
            uvLabelElement.style.color = uvInfo.color;
        }
    } else {
        uvElement.textContent = 'N/A';
        uvElement.style.color = 'var(--text-muted)';
        if (uvLabelElement) {
            uvLabelElement.textContent = '';
        }
    }

    document.getElementById('weatherIcon').innerHTML = weatherIcons[mapWeatherIcon(current.weather[0].icon)] || weatherIcons.sun;

    // Update temperature unit display
    const tempUnitEl = document.querySelector('.temp-unit');
    if (tempUnitEl) {
        tempUnitEl.textContent = currentUnit === 'imperial' ? '°F' : '°C';
    }

    // Add fade animation
    const currentWeather = document.querySelector('.current-weather');
    if (currentWeather) {
        currentWeather.style.animation = 'none';
        setTimeout(() => {
            currentWeather.style.animation = 'fadeIn 0.5s ease';
        }, 10);
    }
}

// Update hourly forecast display
function updateHourlyForecast(forecastData) {
    const hourlyForecast = document.getElementById('hourlyForecast');
    if (!hourlyForecast) return;

    hourlyForecast.innerHTML = '';

    // Get next 24 hours from forecast data
    const currentHour = new Date().getHours();
    const hourlyData = forecastData.list.slice(0, 8); // Get 8 3-hour intervals = 24 hours

    hourlyData.forEach((item, index) => {
        const date = new Date(item.dt * 1000);
        const hour = date.getHours();
        const displayHour = index === 0 ? 'Now' : `${hour}:00`;
        const temp = Math.round(item.main.temp);
        const icon = mapWeatherIcon(item.weather[0].icon);

        const hourlyItem = document.createElement('div');
        hourlyItem.className = 'hourly-item';
        hourlyItem.innerHTML = `
            <div class="hourly-time">${displayHour}</div>
            <div class="hourly-icon">${weatherIcons[icon]}</div>
            <div class="hourly-temp">${temp}°</div>
        `;
        hourlyForecast.appendChild(hourlyItem);
    });
}

// Update Air Quality display
function updateAirQualityDisplay(airQualityData) {
    const aqiSection = document.getElementById('airQualitySection');
    const aqiData = document.getElementById('airQualityData');
    if (!aqiSection || !aqiData) return;

    if (!airQualityData) {
        aqiSection.style.display = 'none';
        return;
    }

    aqiSection.style.display = 'block';
    const aqi = airQualityData.main.aqi;
    const components = airQualityData.components;
    const aqiInfo = getAQIInfo(aqi);

    aqiData.innerHTML = `
        <div class="aqi-main">
            <div class="aqi-value" style="color: ${aqiInfo.color}">${aqi}</div>
            <div class="aqi-info">
                <div class="aqi-label" style="color: ${aqiInfo.color}">${aqiInfo.label}</div>
                <div class="aqi-desc">${aqiInfo.description}</div>
            </div>
        </div>
        <div class="aqi-pollutants">
            <div class="pollutant">
                <span class="pollutant-name">PM2.5</span>
                <span class="pollutant-value">${Math.round(components.pm2_5)}</span>
            </div>
            <div class="pollutant">
                <span class="pollutant-name">PM10</span>
                <span class="pollutant-value">${Math.round(components.pm10)}</span>
            </div>
            <div class="pollutant">
                <span class="pollutant-name">NO₂</span>
                <span class="pollutant-value">${Math.round(components.no2)}</span>
            </div>
            <div class="pollutant">
                <span class="pollutant-name">O₃</span>
                <span class="pollutant-value">${Math.round(components.o3)}</span>
            </div>
        </div>
    `;
}

// Update forecast display with API data
function updateForecastDisplay(forecastData) {
    const forecastGrid = document.getElementById('forecastGrid');
    forecastGrid.innerHTML = '';

    // Group forecast by day (API returns 3-hour intervals)
    const dailyForecasts = {};
    forecastData.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

        if (!dailyForecasts[dayName]) {
            dailyForecasts[dayName] = item;
        }
    });

    // Get next 7 days
    const days = Object.keys(dailyForecasts).slice(0, 7);

    days.forEach(day => {
        const dayData = dailyForecasts[day];
        const high = Math.round(dayData.main.temp_max);
        const low = Math.round(dayData.main.temp_min);
        const icon = mapWeatherIcon(dayData.weather[0].icon);

        const forecastCard = document.createElement('div');
        forecastCard.className = 'forecast-card';
        forecastCard.innerHTML = `
            <div class="forecast-day">${day}</div>
            <div class="forecast-icon">${weatherIcons[icon]}</div>
            <div class="forecast-temps">
                <span class="forecast-high">${high}°</span>
                <span class="forecast-low">${low}°</span>
            </div>
        `;
        forecastGrid.appendChild(forecastCard);
    });
}

// Toggle mobile menu
function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    navLinks.classList.toggle('mobile-open');
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(n => n.remove());

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span class="notification-message">${message}</span>
        <button class="notification-close">&times;</button>
    `;

    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 24px;
        padding: 16px 24px;
        background: ${type === 'success' ? 'var(--success)' : type === 'warning' ? 'var(--warning)' : 'var(--primary)'};
        color: white;
        border-radius: var(--radius);
        box-shadow: var(--shadow-lg);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    // Close button functionality
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });

    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 3000);
}

// Animate elements on scroll
function animateOnScroll() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe elements
    document.querySelectorAll('.feature-card, .data-item, .detail-card').forEach(el => {
        el.style.opacity = '0';
        observer.observe(el);
    });
}

// Add notification animations to CSS
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }

    .notification-close {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        margin: 0;
        opacity: 0.8;
        transition: opacity 0.2s;
    }

    .notification-close:hover {
        opacity: 1;
    }

    /* Mobile navigation styles */
    @media (max-width: 768px) {
        .nav-links {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: var(--surface);
            flex-direction: column;
            padding: 16px;
            border-bottom: 1px solid var(--border);
        }

        .nav-links.mobile-open {
            display: flex;
        }
    }
`;
document.head.appendChild(notificationStyles);

console.log('🌤️ Weather App loaded successfully!');
