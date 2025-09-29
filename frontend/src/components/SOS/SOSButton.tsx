import React, { useState, useCallback, useEffect } from 'react'
import styled, { keyframes, css } from 'styled-components'
import { SOSButtonProps } from '../../types'

// Glowing animation keyframes
const glow = keyframes`
  0% {
    box-shadow: 0 0 20px rgba(255, 0, 0, 0.5);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 60px rgba(255, 0, 0, 0.8), 0 0 100px rgba(255, 0, 0, 0.6);
    transform: scale(1.05);
  }
  100% {
    box-shadow: 0 0 20px rgba(255, 0, 0, 0.5);
    transform: scale(1);
  }
`

const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`

const ripple = keyframes`
  0% {
    transform: scale(0);
    opacity: 1;
  }
  100% {
    transform: scale(4);
    opacity: 0;
  }
`

// Styled components
const SOSContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  position: relative;
  overflow: hidden;
`

const SOSButton = styled.button<{
  isActive: boolean
  disabled: boolean
  isPressed: boolean
}>`
  width: 280px;
  height: 280px;
  border-radius: 50%;
  border: 6px solid #ff0000;
  background: linear-gradient(145deg, #ff0000, #cc0000);
  color: white;
  font-size: 32px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 3px;
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;

  // Remove default button styles
  outline: none;
  -webkit-tap-highlight-color: transparent;
  user-select: none;

  // Shadow and glow effects
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3), 0 0 0 0 rgba(255, 0, 0, 0.7);

  ${(props) =>
    props.isActive &&
    css`
      animation: ${glow} 2s infinite ease-in-out;
    `}

  ${(props) =>
    !props.disabled &&
    css`
      &:hover {
        transform: scale(1.05);
        box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4),
          0 0 30px rgba(255, 0, 0, 0.6);
      }

      &:active {
        transform: scale(0.98);
      }
    `}
  
  ${(props) =>
    props.disabled &&
    css`
      opacity: 0.6;
      background: linear-gradient(145deg, #666, #444);
      border-color: #666;
      animation: none;
    `}
  
  ${(props) =>
    props.isPressed &&
    css`
      animation: ${pulse} 0.3s ease-out;
    `}
`

const RippleEffect = styled.div<{ isActive: boolean }>`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%) scale(0);

  ${(props) =>
    props.isActive &&
    css`
      animation: ${ripple} 0.6s linear;
    `}
`

const StatusText = styled.div<{ status: string }>`
  margin-top: 30px;
  font-size: 18px;
  font-weight: 600;
  text-align: center;
  color: ${(props) => {
    switch (props.status) {
      case 'ready':
        return '#00ff00'
      case 'sending':
        return '#ffaa00'
      case 'sent':
        return '#00ff00'
      case 'error':
        return '#ff4444'
      default:
        return '#ffffff'
    }
  }};

  ${(props) =>
    props.status !== 'ready' &&
    css`
      animation: ${pulse} 1.5s infinite ease-in-out;
    `}
`

const LocationInfo = styled.div`
  margin-top: 15px;
  font-size: 14px;
  color: #cccccc;
  text-align: center;
  max-width: 300px;
`

const EmergencyInfo = styled.div`
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  color: #ffffff;
  text-align: center;
  font-size: 14px;
  opacity: 0.8;
`

interface SOSButtonComponentProps extends SOSButtonProps {
  locationStatus?: string
  locationText?: string
}

const SOSButtonComponent: React.FC<SOSButtonComponentProps> = ({
  onSOSPress,
  isActive,
  disabled = false,
  locationStatus,
  locationText,
}) => {
  const [buttonStatus, setButtonStatus] = useState<
    'ready' | 'sending' | 'sent' | 'error'
  >('ready')
  const [isPressed, setIsPressed] = useState(false)
  const [showRipple, setShowRipple] = useState(false)

  const handleSOSPress = useCallback(async () => {
    if (disabled || buttonStatus === 'sending') return

    // Visual feedback
    setIsPressed(true)
    setShowRipple(true)

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200])
    }

    // Update status
    setButtonStatus('sending')

    try {
      await onSOSPress()
      setButtonStatus('sent')

      // Reset to ready after 3 seconds
      setTimeout(() => {
        setButtonStatus('ready')
      }, 3000)
    } catch (error) {
      console.error('SOS button error:', error)
      setButtonStatus('error')

      // Reset to ready after 5 seconds
      setTimeout(() => {
        setButtonStatus('ready')
      }, 5000)
    }

    // Reset pressed state
    setTimeout(() => {
      setIsPressed(false)
    }, 300)

    // Reset ripple effect
    setTimeout(() => {
      setShowRipple(false)
    }, 600)
  }, [onSOSPress, disabled, buttonStatus])

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.code === 'Enter') {
        event.preventDefault()
        handleSOSPress()
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [handleSOSPress])

  const getStatusText = () => {
    switch (buttonStatus) {
      case 'ready':
        return isActive ? 'READY TO SEND SOS' : 'SOS BUTTON'
      case 'sending':
        return 'SENDING ALERT...'
      case 'sent':
        return 'ALERT SENT ✓'
      case 'error':
        return 'SENDING FAILED'
      default:
        return 'SOS BUTTON'
    }
  }

  const getLocationDisplayText = () => {
    if (!locationText) return 'Location services required'
    if (locationText.length > 50) {
      return locationText.substring(0, 47) + '...'
    }
    return locationText
  }

  return (
    <SOSContainer>
      <SOSButton
        isActive={isActive}
        disabled={disabled}
        isPressed={isPressed}
        onClick={handleSOSPress}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        aria-label="Emergency SOS Button - Press to send distress signal"
        role="button"
        tabIndex={0}
      >
        SOS
        {showRipple && <RippleEffect isActive={showRipple} />}
      </SOSButton>

      <StatusText status={buttonStatus}>{getStatusText()}</StatusText>

      {locationText && (
        <LocationInfo>📍 {getLocationDisplayText()}</LocationInfo>
      )}

      <EmergencyInfo>
        <div>🚨 Emergency Alert System</div>
        <div>Press and hold for immediate assistance</div>
        <div>Your location will be shared with rescue services</div>
      </EmergencyInfo>
    </SOSContainer>
  )
}

export default SOSButtonComponent
