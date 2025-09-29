import React, { useState, useEffect, useCallback } from 'react'
import styled, { createGlobalStyle } from 'styled-components'
import SOSButton from './components/SOS/SOSButton'
import WeatherAlert from './components/Weather/WeatherAlert'
import { useLocation } from './hooks/useLocation'
import { useWeather, useWeatherAlerts } from './hooks/useWeather'
import apiService from './services/api'
import socketService from './services/socket'
import { SOSAlert } from './types'

// Global styles
const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
                 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 
                 'Helvetica Neue', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: #1a1a1a;
    color: #ffffff;
    overflow-x: hidden;
  }

  button {
    font-family: inherit;
  }

  :focus {
    outline: 2px solid #ff6666;
    outline-offset: 2px;
  }

  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`

const AppContainer = styled.div`
  min-height: 100vh;
  position: relative;
  display: flex;
  flex-direction: column;
`

const LoadingOverlay = styled.div<{ isVisible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(26, 26, 26, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  opacity: ${(props) => (props.isVisible ? 1 : 0)};
  visibility: ${(props) => (props.isVisible ? 'visible' : 'hidden')};
  transition: all 0.3s ease;
`

const LoadingContent = styled.div`
  text-align: center;
  color: #ffffff;
`

const LoadingSpinner = styled.div`
  width: 50px;
  height: 50px;
  border: 3px solid #333;
  border-top: 3px solid #ff0000;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`

const ToggleButton = styled.button<{ isActive: boolean }>`
  position: fixed;
  top: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: none;
  background: ${(props) => (props.isActive ? '#ff6666' : '#00cc66')};
  color: white;
  font-size: 24px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1500;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    transform: scale(1.1);
    background: ${(props) => (props.isActive ? '#ff4444' : '#00aa55')};
  }

  &:active {
    transform: scale(0.95);
  }
`

const ComponentsPanel = styled.div`
  position: fixed;
  top: 80px;
  right: 20px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  max-width: 300px;
  z-index: 1400;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
`

const CompactErrorMessage = styled.div`
  position: fixed;
  top: 80px;
  left: 20px;
  background: #ff4444;
  color: white;
  padding: 10px 15px;
  border-radius: 8px;
  z-index: 1500;
  max-width: 250px;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
`

const StatusIndicator = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  gap: 8px;
  z-index: 100;
`

const StatusDot = styled.div<{ isOnline: boolean }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${(props) => (props.isOnline ? '#00cc66' : '#ff4444')};
  box-shadow: 0 0 8px ${(props) => (props.isOnline ? '#00cc66' : '#ff4444')};
`

const LocationDot = styled.div<{ hasLocation: boolean }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${(props) => (props.hasLocation ? '#0099ff' : '#666666')};
  box-shadow: 0 0 8px ${(props) => (props.hasLocation ? '#0099ff' : '#666666')};
`

function App() {
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [activeSOSAlert, setActiveSOSAlert] = useState<SOSAlert | null>(null)
  const [showOtherComponents, setShowOtherComponents] = useState(false)

  // Hooks
  const {
    location,
    isLoading: locationLoading,
    error: locationError,
    isLocationEnabled,
  } = useLocation()
  const { weatherData, error: weatherError } = useWeather(location)
  const { dismissClowing } = useWeatherAlerts(weatherData)

  // Log for debugging (prevents unused variable warnings)
  console.log('App state:', { activeSOSAlert, weatherData })

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚨 Initializing CrisisLink...')

        // Request notification permissions
        if ('Notification' in window && Notification.permission === 'default') {
          await Notification.requestPermission()
        }

        // Connect to socket service
        socketService.connect()

        // Check API health
        const isHealthy = await apiService.healthCheck()
        if (!isHealthy && navigator.onLine) {
          console.warn('⚠️ API server not responding')
        }

        // Subscribe to location updates when location is available
        if (location) {
          socketService.subscribeToAreaUpdates(location)
        }

        setTimeout(() => {
          setIsInitializing(false)
        }, 2000)
      } catch (err: any) {
        console.error('App initialization error:', err)
        setError('Failed to initialize emergency system')
        setIsInitializing(false)
      }
    }

    initializeApp()

    // Cleanup on unmount
    return () => {
      socketService.cleanup()
    }
  }, [location])

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      console.log('📡 Connection restored')
    }

    const handleOffline = () => {
      setIsOffline(true)
      console.log('📡 Connection lost - switching to offline mode')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Update socket location when location changes
  useEffect(() => {
    if (location && socketService.isConnected()) {
      socketService.notifyLocationUpdate(location)
    }
  }, [location])

  // Handle SOS button press
  const handleSOSPress = useCallback(async () => {
    if (!location) {
      throw new Error('Location is required for SOS alerts')
    }

    console.log('🚨 SOS BUTTON PRESSED')

    // Create SOS alert
    const alertData: Omit<SOSAlert, 'id' | 'timestamp'> = {
      location,
      description: 'Emergency assistance needed',
      urgency: 'critical',
      contactInfo: {},
      additionalData: {
        weatherConditions: weatherData?.current,
        dangerLevel: weatherData?.dangerLevel,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      },
    }

    try {
      // Send via API
      const response = await apiService.sendSOSAlert(alertData)

      if (response.success && response.data) {
        setActiveSOSAlert(response.data)
        console.log('✅ SOS alert sent successfully:', response.data.id)

        // Also broadcast via socket for real-time updates
        if (socketService.isConnected()) {
          socketService.broadcastEmergency(response.data)
        }

        // Store in localStorage for offline recovery
        localStorage.setItem(
          'crisislink_active_alert',
          JSON.stringify(response.data)
        )
      } else {
        throw new Error(response.error || 'Failed to send SOS alert')
      }
    } catch (error: any) {
      console.error('SOS Alert failed:', error)

      // Try to store locally for later sync
      const offlineAlert: SOSAlert = {
        ...alertData,
        id: Date.now(), // Temporary ID
        timestamp: new Date().toISOString(),
        status: 'active',
      }

      const offlineAlerts = JSON.parse(
        localStorage.getItem('crisislink_offline_alerts') || '[]'
      )
      offlineAlerts.push(offlineAlert)
      localStorage.setItem(
        'crisislink_offline_alerts',
        JSON.stringify(offlineAlerts)
      )

      throw error
    }
  }, [location, weatherData])

  // Handle errors
  useEffect(() => {
    if (locationError || weatherError) {
      setError(locationError || weatherError)

      // Auto-dismiss error after 5 seconds
      setTimeout(() => {
        setError(null)
      }, 5000)
    }
  }, [locationError, weatherError])

  const getLocationText = () => {
    if (locationError) return 'Location unavailable'
    if (locationLoading) return 'Getting location...'
    if (!location) return 'Location required'

    // Simple location display - in production you'd use reverse geocoding
    return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
  }

  if (isInitializing) {
    return (
      <>
        <GlobalStyle />
        <LoadingOverlay isVisible={true}>
          <LoadingContent>
            <LoadingSpinner />
            <h2>🚨 CrisisLink</h2>
            <p>Initializing emergency system...</p>
          </LoadingContent>
        </LoadingOverlay>
      </>
    )
  }

  return (
    <>
      <GlobalStyle />
      <AppContainer>
        {/* Emergency Weather Alerts - Compact Pop-up */}
        {weatherData && (
          <WeatherAlert
            weatherData={weatherData}
            onDismiss={dismissClowing}
            compact={true}
          />
        )}

        {/* Main SOS Interface - Always Visible */}
        <SOSButton
          onSOSPress={handleSOSPress}
          isActive={isLocationEnabled && !locationLoading}
          disabled={!location || locationLoading}
          locationText={getLocationText()}
        />

        {/* Toggle Button for Other Components */}
        <ToggleButton
          onClick={() => setShowOtherComponents(!showOtherComponents)}
          isActive={showOtherComponents}
        >
          {showOtherComponents ? '×' : '+'}
        </ToggleButton>

        {/* Other Components - Only show when toggled */}
        {showOtherComponents && (
          <ComponentsPanel>
            <h3>🛠️ Additional Features</h3>
            <div style={{ marginBottom: '10px' }}>
              <strong>🗺️ Interactive Map</strong>
              <br />
              <small>View disaster zones and evacuation routes</small>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>🏠 Emergency Shelters</strong>
              <br />
              <small>Find nearby safe locations</small>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>⚙️ Settings</strong>
              <br />
              <small>Language, notifications, contacts</small>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>📱 Offline Mode</strong>
              <br />
              <small>Emergency features without internet</small>
            </div>
            <button
              onClick={() => setShowOtherComponents(false)}
              style={{
                marginTop: '10px',
                padding: '8px 16px',
                background: '#00cc66',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </ComponentsPanel>
        )}

        {/* Error Display - Compact */}
        {error && <CompactErrorMessage>⚠️ {error}</CompactErrorMessage>}

        {/* Minimal Status Indicator */}
        <StatusIndicator>
          <StatusDot isOnline={!isOffline} />
          <LocationDot hasLocation={!!location} />
        </StatusIndicator>
      </AppContainer>
    </>
  )
}

export default App
