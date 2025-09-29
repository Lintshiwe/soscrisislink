import { io, Socket } from 'socket.io-client'
import { SOSAlert, WeatherData, Location, SocketEvents } from '../types'

class SocketService {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  connect(): void {
    const socketUrl =
      process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001'

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    })

    this.socket.on('connect', () => {
      console.log('🔌 Connected to CrisisLink server')
      this.reconnectAttempts = 0
    })

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason)
    })

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error)
      this.reconnectAttempts++

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached')
        this.disconnect()
      }
    })

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconnected after ${attemptNumber} attempts`)
      this.reconnectAttempts = 0
    })
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  // Location-based room management
  joinLocationRoom(location: Location): void {
    if (this.socket) {
      this.socket.emit('join-location', location)
    }
  }

  // SOS Alert methods
  sendSOSAlert(alertData: SOSAlert): void {
    if (this.socket) {
      this.socket.emit('sos-alert', alertData)
    }
  }

  onEmergencyAlert(callback: (alert: SOSAlert) => void): void {
    if (this.socket) {
      this.socket.on('emergency-alert', callback)
    }
  }

  offEmergencyAlert(): void {
    if (this.socket) {
      this.socket.off('emergency-alert')
    }
  }

  // Weather alert methods
  sendWeatherUpdate(weatherData: WeatherData): void {
    if (this.socket) {
      this.socket.emit('weather-update', weatherData)
    }
  }

  onWeatherAlert(callback: (weather: WeatherData) => void): void {
    if (this.socket) {
      this.socket.on('weather-alert', callback)
    }
  }

  offWeatherAlert(): void {
    if (this.socket) {
      this.socket.off('weather-alert')
    }
  }

  // Generic event handling
  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    if (this.socket) {
      this.socket.on(event as string, callback)
    }
  }

  off<K extends keyof SocketEvents>(event: K): void {
    if (this.socket) {
      this.socket.off(event as string)
    }
  }

  emit(event: string, data: any): void {
    if (this.socket) {
      this.socket.emit(event, data)
    }
  }

  // Connection status
  isConnected(): boolean {
    return this.socket?.connected || false
  }

  // Custom events for CrisisLink
  notifyLocationUpdate(location: Location): void {
    this.joinLocationRoom(location)
  }

  broadcastEmergency(alert: SOSAlert): void {
    this.sendSOSAlert(alert)
  }

  subscribeToAreaUpdates(location: Location): void {
    this.joinLocationRoom(location)

    // Set up listeners for area-specific updates
    this.onEmergencyAlert((alert) => {
      console.log('📢 Emergency alert received:', alert)
      // Handle emergency alert UI updates
      this.handleEmergencyAlert(alert)
    })

    this.onWeatherAlert((weather) => {
      console.log('🌩️ Weather alert received:', weather)
      // Handle weather alert UI updates
      this.handleWeatherAlert(weather)
    })
  }

  private handleEmergencyAlert(alert: SOSAlert): void {
    // Trigger browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🚨 Emergency Alert', {
        body: `Emergency reported nearby at ${alert.timestamp}`,
        icon: '/favicon.ico',
        tag: 'emergency-alert',
      })
    }

    // Trigger device vibration if supported
    if (
      'vibrate' in navigator &&
      process.env.REACT_APP_ENABLE_VIBRATION === 'true'
    ) {
      navigator.vibrate([200, 100, 200, 100, 200])
    }
  }

  private handleWeatherAlert(weather: WeatherData): void {
    if (weather.dangerLevel === 'extreme') {
      // Trigger browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('⚠️ Severe Weather Alert', {
          body: `${
            weather.alerts[0]?.description ||
            'Extreme weather conditions detected'
          }`,
          icon: '/favicon.ico',
          tag: 'weather-alert',
        })
      }

      // Trigger device vibration for extreme weather
      if (
        'vibrate' in navigator &&
        process.env.REACT_APP_ENABLE_VIBRATION === 'true'
      ) {
        navigator.vibrate([500, 200, 500, 200, 500])
      }
    }
  }

  // Cleanup method
  cleanup(): void {
    this.offEmergencyAlert()
    this.offWeatherAlert()
    this.disconnect()
  }
}

const socketService = new SocketService()
export default socketService
