import { useState, useEffect, useCallback } from 'react'
import { WeatherData, Location } from '../types'
import apiService from '../services/api'

interface UseWeatherReturn {
  weatherData: WeatherData | null
  isLoading: boolean
  error: string | null
  refetchWeather: () => void
  isDangerous: boolean
}

export const useWeather = (location: Location | null): UseWeatherReturn => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchWeather = useCallback(async () => {
    if (!location) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await apiService.getCurrentWeather(location)

      if (response.success && response.data) {
        setWeatherData(response.data)

        // Store weather data for offline use
        localStorage.setItem(
          'crisislink_last_weather',
          JSON.stringify({
            data: response.data,
            timestamp: Date.now(),
          })
        )
      } else {
        setError(response.error || 'Failed to fetch weather data')

        // Try to use cached weather data
        const cachedWeather = localStorage.getItem('crisislink_last_weather')
        if (cachedWeather) {
          const { data, timestamp } = JSON.parse(cachedWeather)
          const age = Date.now() - timestamp

          // Use cached data if less than 30 minutes old
          if (age < 30 * 60 * 1000) {
            setWeatherData(data)
            console.warn('Using cached weather data due to API error')
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Network error while fetching weather')
      console.error('Weather fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [location])

  // Determine if weather is dangerous
  const isDangerous =
    weatherData?.dangerLevel === 'extreme' ||
    (weatherData?.dangerLevel === 'moderate' && weatherData.alerts.length > 0)

  // Auto-fetch weather when location changes
  useEffect(() => {
    fetchWeather()
  }, [fetchWeather])

  // Set up periodic weather updates
  useEffect(() => {
    const updateInterval = parseInt(
      process.env.REACT_APP_WEATHER_UPDATE_INTERVAL || '300000'
    )

    const intervalId = setInterval(() => {
      if (location) {
        fetchWeather()
      }
    }, updateInterval)

    return () => clearInterval(intervalId)
  }, [fetchWeather, location])

  return {
    weatherData,
    isLoading,
    error,
    refetchWeather: fetchWeather,
    isDangerous,
  }
}

// Hook for weather alerts and notifications
export const useWeatherAlerts = (weatherData: WeatherData | null) => {
  const [alertsShown, setAlertsShown] = useState<Set<string>>(new Set())
  const [shouldShowClowing, setShouldShowClowing] = useState(false)

  useEffect(() => {
    if (!weatherData) return

    const { dangerLevel, alerts } = weatherData

    // Show "clowing" effect for extreme weather
    if (dangerLevel === 'extreme') {
      setShouldShowClowing(true)

      // Trigger device vibration
      if (
        'vibrate' in navigator &&
        process.env.REACT_APP_ENABLE_VIBRATION === 'true'
      ) {
        navigator.vibrate([500, 300, 500, 300, 500])
      }

      // Show browser notification if permitted
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('⚠️ Extreme Weather Alert', {
            body: 'Dangerous weather conditions detected. Take immediate precautions.',
            icon: '/favicon.ico',
            tag: 'weather-extreme',
          })
        } else if (Notification.permission === 'default') {
          Notification.requestPermission()
        }
      }
    } else {
      setShouldShowClowing(false)
    }

    // Process individual weather alerts
    alerts.forEach((alert) => {
      const alertKey = `${alert.event}-${alert.start}`

      if (!alertsShown.has(alertKey) && alert.severity === 'extreme') {
        setAlertsShown((prev) => new Set(Array.from(prev).concat(alertKey)))

        // Show specific alert notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`🌩️ ${alert.event}`, {
            body: alert.description,
            icon: '/favicon.ico',
            tag: `weather-${alertKey}`,
          })
        }
      }
    })
  }, [weatherData, alertsShown])

  const dismissAlert = (alertEvent: string, alertStart: number) => {
    const alertKey = `${alertEvent}-${alertStart}`
    setAlertsShown((prev) => {
      const newSet = new Set(prev)
      newSet.delete(alertKey)
      return newSet
    })
  }

  const dismissClowing = () => {
    setShouldShowClowing(false)
  }

  return {
    shouldShowClowing,
    dismissAlert,
    dismissClowing,
    alertsShown,
  }
}

// Hook for weather-based emergency recommendations
export const useWeatherRecommendations = (weatherData: WeatherData | null) => {
  const [recommendations, setRecommendations] = useState<string[]>([])

  useEffect(() => {
    if (!weatherData) {
      setRecommendations([])
      return
    }

    const newRecommendations: string[] = []
    const { current, dangerLevel, alerts } = weatherData

    // General weather-based recommendations
    if (dangerLevel === 'extreme') {
      newRecommendations.push('🚨 Seek immediate shelter')
      newRecommendations.push('📱 Keep emergency contacts ready')
      newRecommendations.push('🔋 Ensure devices are charged')
    } else if (dangerLevel === 'moderate') {
      newRecommendations.push('⚠️ Monitor weather conditions closely')
      newRecommendations.push('🎒 Prepare emergency supplies')
    }

    // Wind-based recommendations
    if (current.windSpeed * 3.6 > 60) {
      // Convert m/s to km/h
      newRecommendations.push('💨 Avoid outdoor activities - dangerous winds')
      newRecommendations.push('🏠 Secure loose outdoor items')
    }

    // Visibility-based recommendations
    if (current.visibility < 1000) {
      newRecommendations.push('🌫️ Avoid driving - poor visibility')
      newRecommendations.push('🚶‍♂️ Use caution when walking')
    }

    // Alert-specific recommendations
    alerts.forEach((alert) => {
      const eventLower = alert.event.toLowerCase()

      if (eventLower.includes('flood')) {
        newRecommendations.push('🌊 Move to higher ground')
        newRecommendations.push('🚗 Avoid flooded roads')
      } else if (eventLower.includes('fire') || eventLower.includes('smoke')) {
        newRecommendations.push('🔥 Prepare for evacuation')
        newRecommendations.push('😷 Wear mask for smoke protection')
      } else if (
        eventLower.includes('storm') ||
        eventLower.includes('thunder')
      ) {
        newRecommendations.push('⚡ Stay indoors and away from windows')
        newRecommendations.push('🔌 Unplug electrical devices')
      }
    })

    setRecommendations(Array.from(new Set(newRecommendations))) // Remove duplicates
  }, [weatherData])

  return recommendations
}
