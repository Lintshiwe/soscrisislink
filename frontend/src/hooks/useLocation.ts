import { useState, useEffect, useCallback } from 'react'
import { Location } from '../types'

interface UseLocationReturn {
  location: Location | null
  isLoading: boolean
  error: string | null
  requestLocation: () => void
  isLocationEnabled: boolean
}

export const useLocation = (): UseLocationReturn => {
  const [location, setLocation] = useState<Location | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLocationEnabled, setIsLocationEnabled] = useState(false)

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      return
    }

    setIsLoading(true)
    setError(null)

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000, // 5 minutes
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation: Location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }

        setLocation(newLocation)
        setIsLocationEnabled(true)
        setIsLoading(false)
        setError(null)

        // Store location in localStorage for offline use
        localStorage.setItem(
          'crisislink_last_location',
          JSON.stringify(newLocation)
        )
      },
      (err) => {
        let errorMessage = 'Unable to retrieve location'

        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage =
              'Location access denied. Please enable location services.'
            break
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.'
            break
          case err.TIMEOUT:
            errorMessage = 'Location request timed out.'
            break
          default:
            errorMessage =
              'An unknown error occurred while retrieving location.'
            break
        }

        setError(errorMessage)
        setIsLoading(false)
        setIsLocationEnabled(false)

        // Try to use last known location from localStorage
        const lastLocation = localStorage.getItem('crisislink_last_location')
        if (lastLocation) {
          try {
            const parsedLocation = JSON.parse(lastLocation)
            setLocation(parsedLocation)
            console.warn('Using last known location due to geolocation error')
          } catch (parseError) {
            console.error('Failed to parse stored location:', parseError)
          }
        }
      },
      options
    )
  }, [])

  // Watch position for continuous updates
  const watchLocation = useCallback(() => {
    if (!navigator.geolocation) return null

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 60000, // 1 minute
    }

    return navigator.geolocation.watchPosition(
      (position) => {
        const newLocation: Location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }

        setLocation(newLocation)
        localStorage.setItem(
          'crisislink_last_location',
          JSON.stringify(newLocation)
        )
      },
      (err) => {
        console.warn('Location watch error:', err.message)
      },
      options
    )
  }, [])

  // Auto-request location on component mount
  useEffect(() => {
    // Try to get stored location first
    const storedLocation = localStorage.getItem('crisislink_last_location')
    if (storedLocation) {
      try {
        const parsedLocation = JSON.parse(storedLocation)
        setLocation(parsedLocation)
      } catch (parseError) {
        console.error('Failed to parse stored location:', parseError)
      }
    }

    // Request fresh location
    requestLocation()

    // Set up location watching for emergency situations
    const watchId = watchLocation()

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [requestLocation, watchLocation])

  return {
    location,
    isLoading,
    error,
    requestLocation,
    isLocationEnabled,
  }
}

// Hook for reverse geocoding (getting address from coordinates)
export const useReverseGeocode = (location: Location | null) => {
  const [address, setAddress] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!location) return

    setIsLoading(true)

    // Use Nominatim (OpenStreetMap) for reverse geocoding
    // In production, you might want to use a more reliable service
    const geocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&zoom=18&addressdetails=1`

    fetch(geocodeUrl)
      .then((response) => response.json())
      .then((data) => {
        if (data.display_name) {
          setAddress(data.display_name)
        }
        setIsLoading(false)
      })
      .catch((error) => {
        console.error('Reverse geocoding error:', error)
        setIsLoading(false)
      })
  }, [location])

  return { address, isLoading }
}
