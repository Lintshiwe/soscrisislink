const express = require('express')
const axios = require('axios')
const router = express.Router()

// Get current weather for location
router.get('/current', async (req, res) => {
  try {
    const { lat, lon } = req.query

    if (!lat || !lon) {
      return res.status(400).json({
        error: 'Missing required parameters: lat, lon',
      })
    }

    const apiKey = process.env.OPENWEATHERMAP_API_KEY

    // If no API key, return demo data
    if (!apiKey || apiKey === 'your_api_key_here') {
      console.warn('Weather API key not configured, returning demo data')
      const demoWeatherData = generateDemoWeatherData(lat, lon)
      const alerts = generateWeatherAlerts(demoWeatherData)
      const dangerLevel = calculateDangerLevel(demoWeatherData, alerts)

      return res.json({
        current: {
          temperature: demoWeatherData.main.temp,
          description: demoWeatherData.weather[0].description,
          humidity: demoWeatherData.main.humidity,
          windSpeed: demoWeatherData.wind?.speed || 0,
          pressure: demoWeatherData.main.pressure,
          visibility: demoWeatherData.visibility,
        },
        alerts: alerts.map((alert) => ({
          event: alert.event,
          description: alert.description,
          start: alert.start,
          end: alert.end,
          severity: alert.severity,
        })),
        dangerLevel,
        location: {
          name: 'Demo Location',
          country: 'ZA',
          coordinates: { lat: parseFloat(lat), lon: parseFloat(lon) },
        },
        timestamp: new Date().toISOString(),
        source: 'demo',
      })
    }

    const weatherResponse = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
    )

    const weatherData = weatherResponse.data

    // Create mock alerts based on weather conditions for demo purposes
    const alerts = generateWeatherAlerts(weatherData)

    // Determine danger level
    const dangerLevel = calculateDangerLevel(weatherData, alerts)

    res.json({
      current: {
        temperature: weatherData.main.temp,
        description: weatherData.weather[0].description,
        humidity: weatherData.main.humidity,
        windSpeed: weatherData.wind?.speed || 0,
        pressure: weatherData.main.pressure,
        visibility: weatherData.visibility,
      },
      alerts: alerts.map((alert) => ({
        event: alert.event,
        description: alert.description,
        start: alert.start,
        end: alert.end,
        severity: alert.tags?.includes('Extreme') ? 'extreme' : 'moderate',
      })),
      dangerLevel,
      location: {
        name: weatherData.name,
        country: weatherData.sys.country,
        coordinates: { lat: weatherData.coord.lat, lon: weatherData.coord.lon },
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Weather API error:', error.message)
    res.status(500).json({
      error: 'Failed to fetch weather data',
      message: error.message,
    })
  }
})

// Generate demo weather data when API key is not available
function generateDemoWeatherData(lat, lon) {
  // Create realistic demo data based on South African weather patterns
  const isWinter = new Date().getMonth() >= 5 && new Date().getMonth() <= 8
  const baseTemp = isWinter ? 15 : 25
  const tempVariation = (Math.random() - 0.5) * 10

  const weatherConditions = [
    { main: 'Clear', description: 'clear sky', icon: '01d' },
    { main: 'Clouds', description: 'few clouds', icon: '02d' },
    { main: 'Clouds', description: 'scattered clouds', icon: '03d' },
    { main: 'Rain', description: 'light rain', icon: '10d' },
    { main: 'Thunderstorm', description: 'thunderstorm', icon: '11d' },
  ]

  const selectedCondition =
    weatherConditions[Math.floor(Math.random() * weatherConditions.length)]

  return {
    coord: { lon: parseFloat(lon), lat: parseFloat(lat) },
    weather: [selectedCondition],
    main: {
      temp: Math.round(baseTemp + tempVariation),
      feels_like: Math.round(baseTemp + tempVariation + 2),
      temp_min: Math.round(baseTemp + tempVariation - 3),
      temp_max: Math.round(baseTemp + tempVariation + 5),
      pressure: 1013 + Math.round((Math.random() - 0.5) * 20),
      humidity: 40 + Math.round(Math.random() * 40),
    },
    visibility: 10000,
    wind: {
      speed: Math.round(Math.random() * 15 + 3),
      deg: Math.round(Math.random() * 360),
    },
    clouds: {
      all: Math.round(Math.random() * 100),
    },
    sys: {
      country: 'ZA',
      sunrise: Date.now() - 6 * 60 * 60 * 1000,
      sunset: Date.now() + 6 * 60 * 60 * 1000,
    },
    name: 'Demo Location',
  }
}

// Generate weather alerts based on current conditions
function generateWeatherAlerts(weatherData) {
  const alerts = []
  const condition = weatherData.weather[0].main.toLowerCase()
  const temp = weatherData.main.temp
  const windSpeed = weatherData.wind?.speed || 0

  // Temperature alerts
  if (temp > 35) {
    alerts.push({
      event: 'Extreme Heat Warning',
      description: `High temperature of ${temp}°C. Take precautions against heat-related illness.`,
      start: Date.now(),
      end: Date.now() + 6 * 60 * 60 * 1000, // 6 hours
      severity: 'moderate',
    })
  }

  if (temp < 5) {
    alerts.push({
      event: 'Cold Weather Advisory',
      description: `Low temperature of ${temp}°C. Risk of hypothermia and frostbite.`,
      start: Date.now(),
      end: Date.now() + 8 * 60 * 60 * 1000, // 8 hours
      severity: 'moderate',
    })
  }

  // Wind alerts
  if (windSpeed > 15) {
    alerts.push({
      event: 'High Wind Warning',
      description: `Strong winds at ${windSpeed} m/s. Secure loose objects and avoid outdoor activities.`,
      start: Date.now(),
      end: Date.now() + 4 * 60 * 60 * 1000, // 4 hours
      severity: windSpeed > 25 ? 'severe' : 'moderate',
    })
  }

  // Weather condition alerts
  if (condition.includes('storm') || condition.includes('thunder')) {
    alerts.push({
      event: 'Severe Thunderstorm Warning',
      description:
        'Thunderstorms in the area. Seek shelter indoors and avoid open areas.',
      start: Date.now(),
      end: Date.now() + 3 * 60 * 60 * 1000, // 3 hours
      severity: 'severe',
    })
  }

  if (condition.includes('rain') && windSpeed > 10) {
    alerts.push({
      event: 'Heavy Rain and Wind Advisory',
      description:
        'Heavy rain with strong winds. Risk of flooding and fallen trees.',
      start: Date.now(),
      end: Date.now() + 4 * 60 * 60 * 1000, // 4 hours
      severity: 'moderate',
    })
  }

  return alerts
}

// Calculate danger level based on weather conditions
function calculateDangerLevel(weather, alerts) {
  let dangerScore = 0

  // Check for severe weather alerts
  if (alerts.length > 0) {
    dangerScore += alerts.some(
      (alert) =>
        alert.tags?.includes('Extreme') ||
        alert.event.toLowerCase().includes('warning')
    )
      ? 3
      : 2
  }

  // Check weather conditions
  const condition = weather.weather[0].main.toLowerCase()
  const windSpeed = weather.wind?.speed || 0
  const visibility = weather.visibility || 10000

  // Severe weather conditions
  if (['thunderstorm', 'tornado'].includes(condition)) dangerScore += 3
  else if (['rain', 'snow', 'fog'].includes(condition)) dangerScore += 1

  // High wind speeds (m/s to km/h conversion)
  if (windSpeed * 3.6 > 60) dangerScore += 2 // > 60 km/h
  else if (windSpeed * 3.6 > 40) dangerScore += 1 // > 40 km/h

  // Low visibility
  if (visibility < 1000) dangerScore += 2 // < 1km
  else if (visibility < 5000) dangerScore += 1 // < 5km

  // Determine level
  if (dangerScore >= 4) return 'extreme'
  if (dangerScore >= 2) return 'moderate'
  return 'low'
}

// Get weather forecast
router.get('/forecast', async (req, res) => {
  try {
    const { lat, lon, days = 5 } = req.query

    if (!lat || !lon) {
      return res.status(400).json({
        error: 'Missing required parameters: lat, lon',
      })
    }

    const apiKey = process.env.OPENWEATHERMAP_API_KEY
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&cnt=${
        days * 8
      }` // 8 forecasts per day (3-hour intervals)
    )

    const forecast = response.data.list.map((item) => ({
      datetime: item.dt_txt,
      temperature: {
        current: item.main.temp,
        min: item.main.temp_min,
        max: item.main.temp_max,
      },
      description: item.weather[0].description,
      windSpeed: item.wind?.speed || 0,
      humidity: item.main.humidity,
      dangerLevel: calculateDangerLevel(item, []),
    }))

    res.json({
      forecast,
      location: {
        name: response.data.city.name,
        country: response.data.city.country,
        coordinates: {
          lat: response.data.city.coord.lat,
          lon: response.data.city.coord.lon,
        },
      },
    })
  } catch (error) {
    console.error('Weather forecast error:', error.message)
    res.status(500).json({
      error: 'Failed to fetch weather forecast',
      message: error.message,
    })
  }
})

module.exports = router
