import React, { useEffect, useState } from 'react'
import styled, { keyframes, css } from 'styled-components'
import { WeatherAlertProps } from '../../types'

// Screen glow animation ("clowing" effect)
const screenGlow = keyframes`
  0% {
    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  }
  25% {
    background: linear-gradient(135deg, #ff4444 0%, #cc0000 50%, #1a1a1a 100%);
  }
  50% {
    background: linear-gradient(135deg, #ff6666 0%, #ff0000 50%, #2d2d2d 100%);
  }
  75% {
    background: linear-gradient(135deg, #ff4444 0%, #cc0000 50%, #1a1a1a 100%);
  }
  100% {
    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  }
`

const alertPulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 0.9;
  }
  50% {
    transform: scale(1.05);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0.9;
  }
`

const slideIn = keyframes`
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
`

// Styled components
const WeatherAlertOverlay = styled.div<{
  isDangerous: boolean
  showClowing: boolean
}>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  pointer-events: none;

  ${(props) =>
    props.showClowing &&
    css`
      animation: ${screenGlow} 3s infinite ease-in-out;
      pointer-events: all;
    `}
`

const AlertContainer = styled.div<{
  isVisible: boolean
  severity: 'moderate' | 'extreme'
  compact?: boolean
}>`
  position: fixed;
  ${(props) =>
    props.compact
      ? `
    top: 80px;
    left: 20px;
    transform: none;
    min-width: 200px;
    max-width: 250px;
    padding: 12px 16px;
    font-size: 14px;
  `
      : `
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    min-width: 300px;
    max-width: 90vw;
    padding: 20px 30px;
  `}
  z-index: 1001;
  background: ${(props) =>
    props.severity === 'extreme'
      ? 'linear-gradient(135deg, #cc0000, #ff0000)'
      : 'linear-gradient(135deg, #ff6600, #ff9900)'};
  color: white;
  border-radius: ${(props) => (props.compact ? '8px' : '15px')};
  box-shadow: 0 ${(props) => (props.compact ? '4px 12px' : '10px 30px')}
    rgba(0, 0, 0, 0 ${(props) => (props.compact ? '3' : '5')});
  text-align: center;
  border: ${(props) => (props.compact ? '1px' : '2px')} solid
    ${(props) => (props.severity === 'extreme' ? '#ffffff' : '#ffcc00')};

  opacity: ${(props) => (props.isVisible ? 1 : 0)};
  transform: ${(props) =>
    props.compact
      ? props.isVisible
        ? 'translateX(0)'
        : 'translateX(-100%)'
      : `translateX(-50%) ${
          props.isVisible ? 'translateY(0)' : 'translateY(-100%)'
        }`};
  transition: all 0.5s ease-out;

  ${(props) =>
    props.isVisible &&
    !props.compact &&
    css`
      animation: ${slideIn} 0.5s ease-out;
    `}

  ${(props) =>
    props.severity === 'extreme' &&
    !props.compact &&
    css`
      animation: ${alertPulse} 2s infinite ease-in-out,
        ${shake} 0.5s ease-in-out;
    `}

  ${(props) =>
    props.severity === 'extreme' &&
    props.compact &&
    css`
      animation: ${alertPulse} 3s infinite ease-in-out;
    `}
`

const AlertIcon = styled.div<{
  severity: 'moderate' | 'extreme'
  compact?: boolean
}>`
  font-size: ${(props) => {
    if (props.compact) return '20px'
    return props.severity === 'extreme' ? '48px' : '36px'
  }};
  margin-bottom: ${(props) => (props.compact ? '4px' : '10px')};

  ${(props) =>
    props.severity === 'extreme' &&
    css`
      animation: ${alertPulse} 1.5s infinite ease-in-out;
    `}
`

const AlertTitle = styled.h2<{ compact?: boolean }>`
  margin: 0 0 ${(props) => (props.compact ? '4px' : '10px')} 0;
  font-size: ${(props) => (props.compact ? '16px' : '24px')};
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: ${(props) => (props.compact ? '0.5px' : '1px')};
`

const AlertDescription = styled.p<{ compact?: boolean }>`
  margin: 0 0 ${(props) => (props.compact ? '8px' : '15px')} 0;
  font-size: ${(props) => (props.compact ? '12px' : '16px')};
  line-height: 1.4;
`

const AlertActions = styled.div`
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
`

const AlertButton = styled.button<{ variant: 'primary' | 'secondary' }>`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  ${(props) =>
    props.variant === 'primary'
      ? css`
          background: #ffffff;
          color: #cc0000;

          &:hover {
            background: #f0f0f0;
            transform: translateY(-2px);
          }
        `
      : css`
          background: transparent;
          color: #ffffff;
          border: 2px solid #ffffff;

          &:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: translateY(-2px);
          }
        `}

  &:active {
    transform: translateY(0);
  }
`

const WeatherDetails = styled.div`
  margin: 15px 0;
  padding: 15px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  font-size: 14px;
`

const WeatherRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin: 5px 0;
`

const ClowingMessage = styled.div<{ isVisible: boolean }>`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1002;
  background: rgba(0, 0, 0, 0.9);
  color: #ffffff;
  padding: 40px;
  border-radius: 20px;
  text-align: center;
  border: 3px solid #ff0000;
  box-shadow: 0 0 50px rgba(255, 0, 0, 0.5);

  opacity: ${(props) => (props.isVisible ? 1 : 0)};
  transform: translate(-50%, -50%)
    ${(props) => (props.isVisible ? 'scale(1)' : 'scale(0.8)')};
  transition: all 0.3s ease-out;

  ${(props) =>
    props.isVisible &&
    css`
      animation: ${alertPulse} 2s infinite ease-in-out;
    `}
`

const ClowingTitle = styled.h1`
  margin: 0 0 20px 0;
  font-size: 36px;
  color: #ff0000;
  text-transform: uppercase;
  letter-spacing: 2px;
`

const ClowingText = styled.p`
  font-size: 20px;
  margin: 0 0 30px 0;
  line-height: 1.4;
`

const WeatherAlert: React.FC<WeatherAlertProps> = ({
  weatherData,
  onDismiss,
  compact = false,
}) => {
  const [showAlert, setShowAlert] = useState(false)
  const [showClowing, setShowClowing] = useState(false)
  const [currentAlertIndex, setCurrentAlertIndex] = useState(0)

  // Check for dangerous weather conditions
  useEffect(() => {
    if (!weatherData) {
      setShowAlert(false)
      setShowClowing(false)
      return
    }

    const { dangerLevel, alerts } = weatherData

    // Show clowing effect for extreme danger (disabled in compact mode)
    if (dangerLevel === 'extreme') {
      if (!compact) {
        setShowClowing(true)

        // Trigger device vibration for extreme weather
        if ('vibrate' in navigator) {
          const pattern = [500, 300, 500, 300, 500, 300, 500]
          navigator.vibrate(pattern)
        }

        // Auto-dismiss clowing after 10 seconds (but keep alert)
        setTimeout(() => {
          setShowClowing(false)
        }, 10000)
      }
      setShowAlert(true)
    } else if (
      (dangerLevel === 'moderate' && alerts.length > 0) ||
      alerts.some((alert) => alert.severity === 'extreme')
    ) {
      setShowAlert(true)
      setShowClowing(false)
    } else {
      setShowAlert(false)
      setShowClowing(false)
    }
  }, [weatherData, compact])

  // Cycle through multiple alerts
  useEffect(() => {
    if (!weatherData?.alerts.length || !showAlert) return

    if (weatherData.alerts.length > 1) {
      const interval = setInterval(() => {
        setCurrentAlertIndex((prev) => (prev + 1) % weatherData.alerts.length)
      }, 8000)

      return () => clearInterval(interval)
    }
  }, [weatherData?.alerts, showAlert])

  const handleDismissAlert = () => {
    setShowAlert(false)
    setShowClowing(false)
    onDismiss?.()
  }

  const handleGetToSafety = () => {
    // This would trigger navigation to safety features
    console.log('Navigate to safety features')
    handleDismissAlert()
  }

  if (!weatherData || (!showAlert && !showClowing)) {
    return null
  }

  const currentAlert = weatherData.alerts[currentAlertIndex]
  const severity =
    weatherData.dangerLevel === 'extreme' ? 'extreme' : 'moderate'

  const getAlertIcon = () => {
    if (weatherData.dangerLevel === 'extreme') return '🚨'
    if (currentAlert?.event.toLowerCase().includes('storm')) return '⛈️'
    if (currentAlert?.event.toLowerCase().includes('wind')) return '💨'
    if (currentAlert?.event.toLowerCase().includes('rain')) return '🌧️'
    if (currentAlert?.event.toLowerCase().includes('flood')) return '🌊'
    if (currentAlert?.event.toLowerCase().includes('fire')) return '🔥'
    return '⚠️'
  }

  return (
    <>
      {/* Screen glow overlay */}
      <WeatherAlertOverlay
        isDangerous={weatherData.dangerLevel === 'extreme'}
        showClowing={showClowing}
      />

      {/* Clowing message for extreme weather */}
      {showClowing && (
        <ClowingMessage isVisible={showClowing}>
          <ClowingTitle>⚡ EXTREME WEATHER ⚡</ClowingTitle>
          <ClowingText>
            Dangerous conditions detected.
            <br />
            Take immediate precautions!
          </ClowingText>
          <AlertButton variant="primary" onClick={handleGetToSafety}>
            🛡️ Get to Safety
          </AlertButton>
        </ClowingMessage>
      )}

      {/* Weather alert banner */}
      {showAlert && (
        <AlertContainer
          isVisible={showAlert}
          severity={severity}
          compact={compact}
        >
          <AlertIcon severity={severity} compact={compact}>
            {getAlertIcon()}
          </AlertIcon>

          <AlertTitle compact={compact}>
            {currentAlert ? currentAlert.event : 'Weather Alert'}
          </AlertTitle>

          <AlertDescription compact={compact}>
            {currentAlert
              ? currentAlert.description
              : `${weatherData.dangerLevel} weather conditions detected in your area.`}
          </AlertDescription>

          {!compact && (
            <WeatherDetails>
              <WeatherRow>
                <span>🌡️ Temperature:</span>
                <span>{Math.round(weatherData.current.temperature)}°C</span>
              </WeatherRow>
              <WeatherRow>
                <span>💨 Wind Speed:</span>
                <span>
                  {Math.round(weatherData.current.windSpeed * 3.6)} km/h
                </span>
              </WeatherRow>
              <WeatherRow>
                <span>👁️ Visibility:</span>
                <span>
                  {(weatherData.current.visibility / 1000).toFixed(1)} km
                </span>
              </WeatherRow>
              {weatherData.current.humidity && (
                <WeatherRow>
                  <span>💧 Humidity:</span>
                  <span>{weatherData.current.humidity}%</span>
                </WeatherRow>
              )}
            </WeatherDetails>
          )}

          {!compact && (
            <AlertActions>
              <AlertButton variant="primary" onClick={handleGetToSafety}>
                🛡️ Safety Tips
              </AlertButton>
              <AlertButton variant="secondary" onClick={handleDismissAlert}>
                ✕ Dismiss
              </AlertButton>
            </AlertActions>
          )}

          {compact && (
            <AlertActions>
              <AlertButton variant="secondary" onClick={handleDismissAlert}>
                ✕
              </AlertButton>
            </AlertActions>
          )}
        </AlertContainer>
      )}
    </>
  )
}

export default WeatherAlert
