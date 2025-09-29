import axios, { AxiosInstance, AxiosResponse } from 'axios'
import {
  SOSAlert,
  WeatherData,
  APIResponse,
  Shelter,
  EvacuationRoute,
  SafetyTip,
  Location,
} from '../types'

class APIService {
  private api: AxiosInstance

  constructor() {
    this.api = axios.create({
      baseURL:
        process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('crisislink_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message)
        return Promise.reject(error)
      }
    )
  }

  // SOS Alert methods
  async sendSOSAlert(
    alert: Omit<SOSAlert, 'id' | 'timestamp'>
  ): Promise<APIResponse<SOSAlert>> {
    try {
      const response = await this.api.post('/sos/alert', alert)
      return {
        success: true,
        data: response.data.alert,
        message: response.data.message,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to send SOS alert',
        message: error.response?.data?.message,
      }
    }
  }

  async getAlertStatus(alertId: number): Promise<APIResponse<SOSAlert>> {
    try {
      const response = await this.api.get(`/sos/alert/${alertId}`)
      return {
        success: true,
        data: response.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to get alert status',
      }
    }
  }

  async getNearbyAlerts(
    location: Location,
    radius: number = 50
  ): Promise<APIResponse<SOSAlert[]>> {
    try {
      const response = await this.api.get('/sos/nearby', {
        params: {
          lat: location.lat,
          lng: location.lng,
          radius,
        },
      })
      return {
        success: true,
        data: response.data.alerts,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to get nearby alerts',
      }
    }
  }

  // Weather methods
  async getCurrentWeather(
    location: Location
  ): Promise<APIResponse<WeatherData>> {
    try {
      const response = await this.api.get('/weather/current', {
        params: {
          lat: location.lat,
          lon: location.lng,
        },
      })
      return {
        success: true,
        data: response.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to get weather data',
      }
    }
  }

  async getWeatherForecast(
    location: Location,
    days: number = 5
  ): Promise<APIResponse<any>> {
    try {
      const response = await this.api.get('/weather/forecast', {
        params: {
          lat: location.lat,
          lon: location.lng,
          days,
        },
      })
      return {
        success: true,
        data: response.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to get weather forecast',
      }
    }
  }

  // Location and resource methods
  async getNearbyShelters(
    location: Location,
    radius: number = 50
  ): Promise<APIResponse<Shelter[]>> {
    try {
      const response = await this.api.get('/locations/shelters', {
        params: {
          lat: location.lat,
          lng: location.lng,
          radius,
        },
      })
      return {
        success: true,
        data: response.data.shelters,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to get shelters',
      }
    }
  }

  async getEvacuationRoutes(
    location: Location
  ): Promise<APIResponse<EvacuationRoute[]>> {
    try {
      const response = await this.api.get('/locations/evacuation-routes', {
        params: {
          lat: location.lat,
          lng: location.lng,
        },
      })
      return {
        success: true,
        data: response.data.routes,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to get evacuation routes',
      }
    }
  }

  async getSafetyTips(category?: string): Promise<APIResponse<SafetyTip[]>> {
    try {
      const url = category ? `/resources/safety-tips/${category}` : '/resources'
      const response = await this.api.get(url)
      return {
        success: true,
        data: category ? [response.data] : response.data.safetyTips,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to get safety tips',
      }
    }
  }

  async getEmergencyResources(): Promise<APIResponse<any>> {
    try {
      const response = await this.api.get('/resources')
      return {
        success: true,
        data: response.data,
      }
    } catch (error: any) {
      return {
        success: false,
        error:
          error.response?.data?.error || 'Failed to get emergency resources',
      }
    }
  }

  // Notification methods
  async sendNotification(
    message: string,
    recipients: string[],
    type: string = 'emergency'
  ): Promise<APIResponse> {
    try {
      const response = await this.api.post('/notifications/send', {
        message,
        recipients,
        type,
      })
      return {
        success: true,
        message: response.data.message,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to send notification',
      }
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.api.get('/health')
      return true
    } catch (error) {
      return false
    }
  }
}

const apiService = new APIService()
export default apiService
