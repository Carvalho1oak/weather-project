// ===== Weather App JavaScript =====

// Mock weather data for demonstration
const mockWeatherData = {
    'new york': {
        name: 'New York, US',
        temp: 72,
        condition: 'Sunny',
        humidity: '45%',
        windSpeed: '8 mph',
        pressure: '1015 hPa',
        uvIndex: '6',
        icon: 'sun'
    },
    'london': {
        name: 'London, UK',
        temp: 58,
        condition: 'Cloudy',
        humidity: '72%',
        windSpeed: '12 mph',
        pressure: '1012 hPa',
        uvIndex: '2',
        icon: 'cloud'
    },
    'tokyo': {
        name: 'Tokyo, JP',
        temp: 68,
        condition: 'Rainy',
        humidity: '80%',
        windSpeed: '6 mph',
        pressure: '1008 hPa',
        uvIndex: '1',
        icon: 'rain'
    },
    'paris': {
        name: 'Paris, FR',
        temp: 65,
        condition: 'Partly Cloudy',
        humidity: '60%',
        windSpeed: '10 mph',
        pressure: '1014 hPa',
        uvIndex: '4',
        icon: 'partly-cloudy'
    },
    'sydney': {
        name: 'Sydney, AU',
        temp: 78,
        condition: 'Sunny',
        humidity: '55%',
        windSpeed: '15 mph',
        pressure: '1018 hPa',
        uvIndex: '8',
        icon: 'sun'
    },
    'dubai': {
        name: 'Dubai, AE',
        temp: 95,
        condition: 'Sunny',
        humidity: '40%',
        windSpeed: '18 mph',
        pressure: '1010 hPa',
        uvIndex: '11',
        icon: 'sun'
    }
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
    generateForecast();
    setupEventListeners();
    animateOnScroll();
});

// Update current date
function updateCurrentDate() {
    const dateElement = document.getElementById('currentDate');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date().toLocaleDateString('en-US', options);
    dateElement.textContent = today;
}

// Generate 7-day forecast
function generateForecast() {
    const forecastGrid = document.getElementById('forecastGrid');
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date().getDay();

    // Adjust starting day
    const adjustedDays = [...days.slice(today - 1), ...days.slice(0, today - 1)];

    adjustedDays.forEach((day, index) => {
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

    // Mobile menu toggle
    mobileMenuBtn.addEventListener('click', toggleMobileMenu);

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

// Handle search
function handleSearch() {
    const citySearch = document.getElementById('citySearch');
    const searchTerm = citySearch.value.toLowerCase().trim();

    if (!searchTerm) {
        showNotification('Please enter a city name', 'warning');
        return;
    }

    // Show loading state
    const searchBtn = document.getElementById('searchBtn');
    const originalText = searchBtn.textContent;
    searchBtn.textContent = 'Loading...';
    searchBtn.disabled = true;

    // Simulate API call
    setTimeout(() => {
        // Find matching city or use default
        let weatherData = null;

        for (const [key, data] of Object.entries(mockWeatherData)) {
            if (key.includes(searchTerm) || searchTerm.includes(key)) {
                weatherData = data;
                break;
            }
        }

        // Default to New York if no match
        if (!weatherData) {
            weatherData = {
                name: searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1),
                temp: 65 + Math.floor(Math.random() * 25),
                condition: ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy'][Math.floor(Math.random() * 4)],
                humidity: Math.floor(40 + Math.random() * 40) + '%',
                windSpeed: Math.floor(5 + Math.random() * 15) + ' mph',
                pressure: (1000 + Math.floor(Math.random() * 30)) + ' hPa',
                uvIndex: Math.floor(Math.random() * 11).toString(),
                icon: ['sun', 'cloud', 'rain', 'partly-cloudy'][Math.floor(Math.random() * 4)]
            };
        }

        updateWeatherDisplay(weatherData);

        // Reset button
        searchBtn.textContent = originalText;
        searchBtn.disabled = false;

        // Show notification
        showNotification(`Weather updated for ${weatherData.name}`, 'success');

        // Scroll to weather display
        document.getElementById('weatherDisplay').scrollIntoView({ behavior: 'smooth' });
    }, 800);
}

// Update weather display
function updateWeatherDisplay(data) {
    document.getElementById('cityName').textContent = data.name;
    document.getElementById('temperature').textContent = data.temp;
    document.getElementById('weatherDesc').textContent = data.condition;
    document.getElementById('humidity').textContent = data.humidity;
    document.getElementById('windSpeed').textContent = data.windSpeed;
    document.getElementById('pressure').textContent = data.pressure;
    document.getElementById('uvIndex').textContent = data.uvIndex;
    document.getElementById('weatherIcon').innerHTML = weatherIcons[data.icon] || weatherIcons.sun;

    // Add fade animation
    const weatherSection = document.querySelector('.current-weather');
    weatherSection.style.animation = 'none';
    setTimeout(() => {
        weatherSection.style.animation = 'fadeIn 0.5s ease';
    }, 10);
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

// Simulate real-time weather updates
setInterval(() => {
    const tempElement = document.getElementById('temperature');
    if (tempElement) {
        const currentTemp = parseInt(tempElement.textContent);
        const change = Math.random() > 0.5 ? 1 : -1;
        const newTemp = currentTemp + (Math.random() > 0.7 ? change : 0);
        tempElement.textContent = newTemp;
    }
}, 60000); // Update every minute

console.log('🌤️ Weather App loaded successfully!');
