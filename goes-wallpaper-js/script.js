/**
 * GOES Wallpaper - JavaScript Implementation
 * 
 * This script fetches and displays satellite imagery from GOES satellites.
 * It allows users to select different satellites, regions, and bands.
 */

// DOM Elements
const satelliteSelect = document.getElementById('satellite-select');
const regionSelect = document.getElementById('region-select');
const bandSelect = document.getElementById('band-select');
const refreshBtn = document.getElementById('refresh-btn');
const downloadBtn = document.getElementById('download-btn');
const homeBtn = document.getElementById('home-btn');
const satelliteImage = document.getElementById('satellite-image');
const loadingElement = document.getElementById('loading');
const imageInfo = document.getElementById('image-info');
const errorMessage = document.getElementById('error-message');

// Configuration
const config = {
    baseUrl: 'https://cdn.star.nesdis.noaa.gov',
    corsProxyUrl: 'https://corsproxy.io/?',  // CORS proxy service
    satellites: {
        'goes-east': {
            id: 'GOES16',
            fullName: 'GOES-East (GOES-16)',
            regions: {
                'full_disk': 'GOES16-ABI-FD',
                'conus': 'GOES16-ABI-CONUS',
                'mesoscale_1': 'GOES16-ABI-M1',
                'mesoscale_2': 'GOES16-ABI-M2'
            }
        },
        'goes-west': {
            id: 'GOES18',
            fullName: 'GOES-West (GOES-18)',
            regions: {
                'full_disk': 'GOES18-ABI-FD',
                'conus': 'GOES18-ABI-CONUS',
                'mesoscale_1': 'GOES18-ABI-M1',
                'mesoscale_2': 'GOES18-ABI-M2'
            }
        }
    },
    bands: {
        'GEOCOLOR': 'GEOCOLOR',
        '02': 'Band 2 (Visible)',
        '13': 'Band 13 (Clean IR)'
    },
    refreshInterval: 10 * 60 * 1000 // 10 minutes
};

// Current state
let currentImageUrl = '';
let autoRefreshTimer = null;
let animationFrameId = null;
let panX = 0;
let panY = 0;
let tiltX = 0;
let tiltY = 0;
let targetPanX = 0;
let targetPanY = 0;
let targetTiltX = 0;
let targetTiltY = 0;
let transitionStartTime = 0;
let transitionDuration = 0; // in milliseconds
let lastTargetChangeTime = 0;

/**
 * Constructs the URL for the satellite image based on current selections
 */
function constructImageUrl() {
    const satellite = satelliteSelect.value;
    const region = regionSelect.value;
    const band = bandSelect.value;

    // Get the satellite ID and region code
    const satelliteId = config.satellites[satellite].id;
    const regionCode = config.satellites[satellite].regions[region];

    // Construct the URL
    // Format: https://cdn.star.nesdis.noaa.gov/GOES16/ABI/FD/GEOCOLOR/latest.jpg
    return `${config.baseUrl}/${satelliteId}/ABI/${region.toUpperCase()}/${band}/latest.jpg`;
}

/**
 * Fetches and displays the satellite image
 */
function fetchSatelliteImage() {
    // Show loading indicator
    loadingElement.style.display = 'flex';

    // Construct the image URL
    const imageUrl = constructImageUrl();
    currentImageUrl = imageUrl;

    // Add a cache-busting parameter to ensure we get the latest image
    const cacheBuster = `?t=${new Date().getTime()}`;

    // Use CORS proxy for the image source to avoid cross-origin issues
    // Double-encode the URL to prevent issues with special characters
    const urlToProxy = imageUrl + cacheBuster;
    const proxiedUrl = config.corsProxyUrl + encodeURIComponent(urlToProxy);

    // Set the image source
    satelliteImage.src = proxiedUrl;

    // Update image info
    updateImageInfo();
}

/**
 * Updates the image information display
 */
function updateImageInfo() {
    const satellite = satelliteSelect.value;
    const region = regionSelect.value;
    const band = bandSelect.value;

    const satelliteName = config.satellites[satellite].fullName;
    const regionName = region.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    const bandName = config.bands[band];

    const currentTime = new Date().toLocaleString();

    imageInfo.innerHTML = `
        <p>Satellite: ${satelliteName}</p>
        <p>Region: ${regionName}</p>
        <p>Band: ${bandName}</p>
        <p>Last Updated: ${currentTime}</p>
        <p><small>Images are typically updated every 10-15 minutes by NOAA</small></p>
    `;
}

/**
 * Handles image loading events
 */
function handleImageLoad() {
    // Hide loading indicator
    loadingElement.style.display = 'none';
}

/**
 * Downloads the current satellite image
 */
function downloadImage() {
    if (!currentImageUrl) {
        return;
    }

    const satellite = satelliteSelect.value;
    const region = regionSelect.value;
    const band = bandSelect.value;

    // Create a filename for the download
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${config.satellites[satellite].id}_${region}_${band}_${timestamp}.jpg`;

    // Add a cache-busting parameter to ensure we get the latest image
    const cacheBuster = `?t=${new Date().getTime()}`;
    const urlToDownload = currentImageUrl + cacheBuster;

    // Create a temporary link element to trigger the download
    const link = document.createElement('a');

    // For downloads, we'll try multiple approaches with fallbacks
    const downloadWithUrl = (url) => {
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Fetch the image and create a blob URL
    fetch(urlToDownload)
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            downloadWithUrl(url);
            window.URL.revokeObjectURL(url);
        });
}

/**
 * Sets up auto-refresh functionality
 */
function setupAutoRefresh() {
    // Clear any existing timer
    if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
    }

    // Set up a new timer
    autoRefreshTimer = setInterval(fetchSatelliteImage, config.refreshInterval);
}

/**
 * Setup for the home button (always visible now)
 */
function setupHomeButton() {
    // Home button is now always visible with the floating-home-btn class
    // No need to check URL parameters anymore
}

/**
 * Updates the animation for panning and tilting effects
 */
function updateAnimation() {
    const currentTime = Date.now();

    // Check if it's time to update target values (only if previous transition is complete or nearly complete)
    const timeSinceLastChange = currentTime - lastTargetChangeTime;
    const transitionProgress = transitionDuration > 0 ? Math.min(timeSinceLastChange / transitionDuration, 1) : 1;

    // Occasionally update target values for random movement (if previous transition is at least 90% complete)
    if (Math.random() < 0.005 && transitionProgress > 0.9) { // 0.5% chance each frame to change direction
        // Set new random targets within a reasonable range
        targetPanX = (Math.random() - 0.5) * 40; // -20px to +20px
        targetPanY = (Math.random() - 0.5) * 40; // -20px to +20px
        targetTiltX = (Math.random() - 0.5) * 3; // -1.5deg to +1.5deg
        targetTiltY = (Math.random() - 0.5) * 3; // -1.5deg to +1.5deg

        // Generate a random transition duration between 5 and 60 seconds
        transitionDuration = (Math.random() * 55 + 5) * 1000; // Convert to milliseconds
        transitionStartTime = currentTime;
        lastTargetChangeTime = currentTime;
    }

    // Calculate the appropriate easing factor based on elapsed time and duration
    let easingFactor;
    if (transitionDuration > 0) {
        // Calculate progress as a value between 0 and 1
        const progress = Math.min((currentTime - transitionStartTime) / transitionDuration, 1);

        // Use a dynamic easing factor that ensures smooth movement and completes within the duration
        // This formula ensures the transition will be approximately complete within the specified duration
        easingFactor = 0.01 + (1 - Math.pow(1 - progress, 3)) * 0.05;
    } else {
        // Default easing factor if no transition is in progress
        easingFactor = 0.01;
    }

    // Smooth transition to target values using the calculated easing factor
    panX += (targetPanX - panX) * easingFactor;
    panY += (targetPanY - panY) * easingFactor;
    tiltX += (targetTiltX - tiltX) * easingFactor;
    tiltY += (targetTiltY - tiltY) * easingFactor;

    // Apply transformations to the image
    const imageContainer = document.querySelector('.image-container');
    imageContainer.style.transform = `scale(1.3) translate(${panX}px, ${panY}px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;

    // Continue the animation loop
    animationFrameId = requestAnimationFrame(updateAnimation);
}

/**
 * Sets up the immersive view with scaling and animation
 */
function setupImmersiveView() {
    // Set initial style for the image container
    const imageContainer = document.querySelector('.image-container');
    imageContainer.style.transformOrigin = 'center center';
    imageContainer.style.transition = 'transform 0.1s ease-out';
    imageContainer.style.transform = 'scale(1.3)';
    imageContainer.style.overflow = 'hidden';
    imageContainer.style.perspective = '1000px';

    // Add a wrapper div for better perspective effect
    const container = document.querySelector('.container');
    container.style.perspective = '1000px';
    container.style.perspectiveOrigin = 'center center';

    // Initialize transition variables with random values
    const currentTime = Date.now();
    transitionStartTime = currentTime;
    lastTargetChangeTime = currentTime;

    // Set initial random transition duration between 5-60 seconds
    transitionDuration = (Math.random() * 55 + 5) * 1000; // Convert to milliseconds

    // Set initial random target values
    targetPanX = (Math.random() - 0.5) * 40; // -20px to +20px
    targetPanY = (Math.random() - 0.5) * 40; // -20px to +20px
    targetTiltX = (Math.random() - 0.5) * 3; // -1.5deg to +1.5deg
    targetTiltY = (Math.random() - 0.5) * 3; // -1.5deg to +1.5deg

    // Start the animation
    animationFrameId = requestAnimationFrame(updateAnimation);
}

/**
 * Initializes the application
 */
function init() {
    // Set up event listeners
    satelliteImage.addEventListener('load', handleImageLoad);

    refreshBtn.addEventListener('click', fetchSatelliteImage);
    downloadBtn.addEventListener('click', downloadImage);

    // Add change event listeners to the select elements
    satelliteSelect.addEventListener('change', fetchSatelliteImage);
    regionSelect.addEventListener('change', fetchSatelliteImage);
    bandSelect.addEventListener('change', fetchSatelliteImage);

    // Setup home button visibility
    setupHomeButton();

    // Initial fetch
    fetchSatelliteImage();

    // Set up auto-refresh
    setupAutoRefresh();

    // Set up immersive view with scaling and animation
    setupImmersiveView();
}

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);

// Clean up animation when page is unloaded to prevent memory leaks
window.addEventListener('beforeunload', () => {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
});
