// Location and geographical types
export interface Location {
  lat: number
  lng: number
  accuracy?: number
  address?: string
}

// SOS Alert types
export interface SOSAlert {
  id?: number
  location: Location
  description?: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
  contactInfo?: ContactInfo
  additionalData?: Record<string, any>
  status?: 'active' | 'acknowledged' | 'responded' | 'resolved'
  timestamp?: string
  acknowledged?: boolean
  responderAssigned?: string
  estimatedResponse?: string
}

export interface ContactInfo {
  name?: string
  phone?: string
  email?: string
  alternateContact?: string
}

// Weather types
export interface WeatherData {
  current: {
    temperature: number
    description: string
    humidity: number
    windSpeed: number
    pressure: number
    visibility: number
  }
  alerts: WeatherAlert[]
  dangerLevel: 'low' | 'moderate' | 'extreme'
  location: {
    name: string
    country: string
    coordinates: Location
  }
  timestamp: string
}

export interface WeatherAlert {
  event: string
  description: string
  start: number
  end: number
  severity: 'moderate' | 'extreme'
}

// Map and resource types
export interface Shelter {
  id: number
  name: string
  location: Location
  capacity: number
  available: number
  facilities: string[]
  contact: string
}

export interface EvacuationRoute {
  id: number
  name: string
  waypoints: Location[]
  status: 'open' | 'closed' | 'congested'
  estimatedTime: string
}

export interface DisasterZone {
  id: number
  type: 'flood' | 'fire' | 'storm' | 'earthquake'
  location: Location
  radius: number
  severity: 'low' | 'medium' | 'high' | 'extreme'
  lastUpdated: string
}

// Safety and resource types
export interface SafetyTip {
  id: number
  category: string
  title: string
  tips: string[]
}

export interface EmergencyContact {
  name: string
  number: string
  description?: string
}

// App state types
export interface AppState {
  userLocation: Location | null
  isLocationEnabled: boolean
  weatherData: WeatherData | null
  isWeatherDangerous: boolean
  activeAlert: SOSAlert | null
  isOffline: boolean
  language: 'en' | 'zu' | 'xh' | 'af'
  sidePanelOpen: boolean
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Socket events
export interface SocketEvents {
  'sos-alert': (alert: SOSAlert) => void
  'weather-update': (weather: WeatherData) => void
  'emergency-alert': (alert: SOSAlert) => void
  'weather-alert': (weather: WeatherData) => void
  'join-location': (location: Location) => void
}

// Component prop types
export interface SOSButtonProps {
  onSOSPress: () => void
  isActive: boolean
  disabled?: boolean
}

export interface WeatherAlertProps {
  weatherData: WeatherData
  onDismiss?: () => void
  compact?: boolean
}

export interface MapComponentProps {
  center: Location
  alerts?: SOSAlert[]
  shelters?: Shelter[]
  evacuationRoutes?: EvacuationRoute[]
  disasterZones?: DisasterZone[]
  onLocationSelect?: (location: Location) => void
}

export interface SidePanelProps {
  isOpen: boolean
  onClose: () => void
  userLocation: Location | null
}
