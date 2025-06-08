# GOES Wallpaper (JavaScript)

A JavaScript implementation of a GOES satellite imagery viewer. This web application allows you to view and download the latest satellite images from GOES-East (GOES-16) and GOES-West (GOES-18) satellites.

## Features

- View real-time satellite imagery from GOES-East and GOES-West
- Select different regions (Full Disk, Continental US, Mesoscale 1, Mesoscale 2)
- Choose different bands (GeoColor, Visible, Clean IR)
- Auto-refresh to always show the latest imagery
- Download images for use as wallpapers or other purposes

## How It Works

This application fetches the latest satellite imagery from NOAA's GOES satellites via their public CDN. The images are typically updated every 10-15 minutes by NOAA.

The URL structure for the images follows this pattern:
```
https://cdn.star.nesdis.noaa.gov/[SATELLITE]/ABI/[REGION]/[BAND]/latest.jpg
```

For example:
```
https://cdn.star.nesdis.noaa.gov/GOES16/ABI/FD/GEOCOLOR/latest.jpg
```

### CORS Proxy System

This application uses a robust CORS proxy system to fetch the satellite images. This is necessary because the NOAA CDN does not include the proper CORS headers to allow direct access from other domains. The proxy adds these headers, allowing the images to be displayed in the browser.

#### Enhanced CORS Handling

The application implements multiple layers of CORS handling:

1. **Primary Proxy**: Uses corsproxy.io as the main proxy service
2. **Fallback Proxy**: Automatically tries an alternative proxy (allorigins.win) if the primary proxy fails
3. **Smart Retry Logic**: Implements a single retry attempt to prevent infinite retry loops when proxies fail
4. **Error Recovery**: Provides detailed error messages and recovery suggestions when image loading fails
5. **Download Resilience**: Uses a cascading fallback system for downloads to ensure maximum reliability

#### Troubleshooting CORS Issues

If you encounter any issues with the proxy (such as "orb errors" or other CORS-related problems), the application will automatically try alternative methods. If problems persist, you may need to:

1. Refresh the page and try again
2. Try a different satellite or region
3. Check your network connection
4. Wait a few minutes and try again (the proxy services may have temporary rate limits)
5. Try a different browser
6. Host the application on your own server with appropriate CORS configuration

## Usage

1. Select a satellite (GOES-East or GOES-West)
2. Choose a region (Full Disk, Continental US, etc.)
3. Select a band (GeoColor, Visible, Clean IR)
4. The image will automatically load and refresh every 10 minutes
5. Use the "Refresh Image" button to manually update the image
6. Use the "Download Image" button to save the current image to your device

## About GOES Satellites

The Geostationary Operational Environmental Satellite (GOES) system is operated by the National Oceanic and Atmospheric Administration (NOAA). These satellites provide continuous monitoring of Earth's atmosphere, helping meteorologists observe and predict weather patterns, including severe local storms and tropical cyclones.

- **GOES-East (GOES-16)** is positioned at 75.2°W longitude and provides coverage of North and South America and the Atlantic Ocean.
- **GOES-West (GOES-18)** is positioned at 137.2°W longitude and provides coverage of North America and the Pacific Ocean.

## Credits

- Satellite imagery provided by [NOAA](https://www.noaa.gov/)
- This is a JavaScript implementation of the [original GOES Wallpaper project](https://github.com/gabrsar/goes-wallpaper)

## License

This project is open source and available under the MIT License.
