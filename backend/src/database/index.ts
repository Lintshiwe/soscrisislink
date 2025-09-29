const { Pool } = require('pg')

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'crisislink',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}

// Create connection pool
export const pool = new Pool(dbConfig)

// Database connection health check
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect()
    await client.query('SELECT NOW()')
    client.release()
    console.log('✅ Database connection successful')
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}

// Helper function to convert coordinates to PostGIS POINT
export const createPoint = (lng: number, lat: number): string => {
  return `ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)`
}

// Helper function to convert GeoJSON Point to PostGIS
export const pointFromGeoJSON = (point: Point): string => {
  const [lng, lat] = point.coordinates
  return createPoint(lng, lat)
}

// Helper function to convert GeoJSON Polygon to PostGIS
export const polygonFromGeoJSON = (polygon: Polygon): string => {
  const coordinates = polygon.coordinates[0]
    .map((coord) => `${coord[0]} ${coord[1]}`)
    .join(', ')
  return `ST_SetSRID(ST_GeomFromText('POLYGON((${coordinates}))'), 4326)`
}

// Helper function to convert GeoJSON LineString to PostGIS
export const lineStringFromGeoJSON = (lineString: LineString): string => {
  const coordinates = lineString.coordinates
    .map((coord) => `${coord[0]} ${coord[1]}`)
    .join(', ')
  return `ST_SetSRID(ST_GeomFromText('LINESTRING(${coordinates})'), 4326)`
}

// Database query interfaces
export interface SOSAlert {
  id: number
  user_id?: number
  location_lat: number
  location_lng: number
  location_accuracy?: number
  description?: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
  status: 'active' | 'acknowledged' | 'responding' | 'resolved' | 'false_alarm'
  contact_info?: any
  additional_data?: any
  weather_conditions?: any
  responder_id?: number
  estimated_response_time?: string
  response_time?: string
  resolved_at?: Date
  created_at: Date
  updated_at: Date
}

export interface EmergencyShelter {
  id: number
  name: string
  location_lat: number
  location_lng: number
  address?: string
  capacity: number
  current_occupancy: number
  available_space?: number
  facilities: string[]
  contact_phone?: string
  contact_email?: string
  manager_name?: string
  status: 'operational' | 'full' | 'closed' | 'maintenance'
  accessibility_features?: string[]
  pet_friendly: boolean
  medical_facilities: boolean
  distance_km?: number
  created_at: Date
  updated_at: Date
}

export interface DisasterZone {
  id: number
  name?: string
  center_lat: number
  center_lng: number
  disaster_type:
    | 'flood'
    | 'fire'
    | 'storm'
    | 'earthquake'
    | 'landslide'
    | 'drought'
  severity: 'low' | 'medium' | 'high' | 'extreme'
  status: 'active' | 'monitoring' | 'resolved' | 'archived'
  estimated_affected_population?: number
  evacuation_recommended: boolean
  evacuation_mandatory: boolean
  weather_related: boolean
  source?: string
  confidence_level?: number
  predicted_duration?: string
  created_at: Date
  updated_at: Date
  resolved_at?: Date
}

export interface WeatherAlert {
  id: number
  location_lat: number
  location_lng: number
  event_type: string
  severity: 'minor' | 'moderate' | 'severe' | 'extreme'
  description?: string
  start_time: Date
  end_time?: Date
  weather_data?: any
  source: string
  alert_id?: string
  affected_population?: number
  created_at: Date
}

// SOS Alert database operations
export const sosAlertQueries = {
  // Create new SOS alert
  create: async (
    alert: Omit<SOSAlert, 'id' | 'created_at' | 'updated_at'>
  ): Promise<SOSAlert> => {
    const query = `
      INSERT INTO sos_alerts (
        user_id, location, location_accuracy, description, urgency, 
        status, contact_info, additional_data, weather_conditions
      ) VALUES (
        $1, ${createPoint(
          alert.location_lng,
          alert.location_lat
        )}, $2, $3, $4, $5, $6, $7, $8
      ) RETURNING 
        id, user_id, ST_Y(location) as location_lat, ST_X(location) as location_lng,
        location_accuracy, description, urgency, status, contact_info, additional_data,
        weather_conditions, responder_id, estimated_response_time, response_time,
        resolved_at, created_at, updated_at
    `

    const values = [
      alert.user_id,
      alert.location_accuracy,
      alert.description,
      alert.urgency,
      alert.status,
      alert.contact_info ? JSON.stringify(alert.contact_info) : null,
      alert.additional_data ? JSON.stringify(alert.additional_data) : null,
      alert.weather_conditions
        ? JSON.stringify(alert.weather_conditions)
        : null,
    ]

    const result = await pool.query(query, values)
    return result.rows[0]
  },

  // Get nearby SOS alerts
  getNearby: async (
    lat: number,
    lng: number,
    radiusKm: number = 50
  ): Promise<SOSAlert[]> => {
    const result = await pool.query(
      'SELECT * FROM get_nearby_sos_alerts($1, $2, $3)',
      [lat, lng, radiusKm]
    )
    return result.rows
  },

  // Update SOS alert status
  updateStatus: async (
    id: number,
    status: SOSAlert['status'],
    responderId?: number
  ): Promise<SOSAlert | null> => {
    const query = `
      UPDATE sos_alerts 
      SET status = $2, responder_id = $3, updated_at = CURRENT_TIMESTAMP
      ${status === 'resolved' ? ', resolved_at = CURRENT_TIMESTAMP' : ''}
      WHERE id = $1
      RETURNING 
        id, user_id, ST_Y(location) as location_lat, ST_X(location) as location_lng,
        location_accuracy, description, urgency, status, contact_info, additional_data,
        weather_conditions, responder_id, estimated_response_time, response_time,
        resolved_at, created_at, updated_at
    `

    const result = await pool.query(query, [id, status, responderId])
    return result.rows[0] || null
  },

  // Get alert by ID
  getById: async (id: number): Promise<SOSAlert | null> => {
    const query = `
      SELECT 
        id, user_id, ST_Y(location) as location_lat, ST_X(location) as location_lng,
        location_accuracy, description, urgency, status, contact_info, additional_data,
        weather_conditions, responder_id, estimated_response_time, response_time,
        resolved_at, created_at, updated_at
      FROM sos_alerts WHERE id = $1
    `

    const result = await pool.query(query, [id])
    return result.rows[0] || null
  },

  // Get active alerts
  getActive: async (): Promise<SOSAlert[]> => {
    const query = `
      SELECT 
        id, user_id, ST_Y(location) as location_lat, ST_X(location) as location_lng,
        location_accuracy, description, urgency, status, contact_info, additional_data,
        weather_conditions, responder_id, estimated_response_time, response_time,
        resolved_at, created_at, updated_at
      FROM sos_alerts 
      WHERE status IN ('active', 'acknowledged', 'responding')
      ORDER BY created_at DESC
    `

    const result = await pool.query(query)
    return result.rows
  },
}

// Emergency Shelter database operations
export const shelterQueries = {
  // Get nearby shelters
  getNearby: async (
    lat: number,
    lng: number,
    radiusKm: number = 50
  ): Promise<EmergencyShelter[]> => {
    const result = await pool.query(
      'SELECT * FROM get_nearby_shelters($1, $2, $3)',
      [lat, lng, radiusKm]
    )
    return result.rows
  },

  // Get all operational shelters
  getOperational: async (): Promise<EmergencyShelter[]> => {
    const query = `
      SELECT 
        id, name, ST_Y(location) as location_lat, ST_X(location) as location_lng,
        address, capacity, current_occupancy, (capacity - current_occupancy) as available_space,
        facilities, contact_phone, contact_email, manager_name, status,
        accessibility_features, pet_friendly, medical_facilities, created_at, updated_at
      FROM emergency_shelters 
      WHERE status = 'operational'
      ORDER BY name
    `

    const result = await pool.query(query)
    return result.rows
  },

  // Update shelter occupancy
  updateOccupancy: async (
    id: number,
    occupancy: number
  ): Promise<EmergencyShelter | null> => {
    const query = `
      UPDATE emergency_shelters 
      SET current_occupancy = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING 
        id, name, ST_Y(location) as location_lat, ST_X(location) as location_lng,
        address, capacity, current_occupancy, (capacity - current_occupancy) as available_space,
        facilities, contact_phone, contact_email, manager_name, status,
        accessibility_features, pet_friendly, medical_facilities, created_at, updated_at
    `

    const result = await pool.query(query, [id, occupancy])
    return result.rows[0] || null
  },
}

// Disaster Zone database operations
export const disasterZoneQueries = {
  // Check if point is in disaster zone
  checkLocation: async (lat: number, lng: number): Promise<DisasterZone[]> => {
    const result = await pool.query(
      'SELECT * FROM is_in_disaster_zone($1, $2)',
      [lat, lng]
    )
    return result.rows
  },

  // Get all active disaster zones
  getActive: async (): Promise<DisasterZone[]> => {
    const query = `
      SELECT 
        id, name, ST_Y(center_point) as center_lat, ST_X(center_point) as center_lng,
        disaster_type, severity, status, estimated_affected_population,
        evacuation_recommended, evacuation_mandatory, weather_related,
        source, confidence_level, predicted_duration, created_at, updated_at, resolved_at
      FROM disaster_zones 
      WHERE status = 'active'
      ORDER BY severity DESC, created_at DESC
    `

    const result = await pool.query(query)
    return result.rows
  },

  // Create disaster zone
  create: async (
    zone: Omit<DisasterZone, 'id' | 'created_at' | 'updated_at'>
  ): Promise<DisasterZone> => {
    const query = `
      INSERT INTO disaster_zones (
        name, center_point, disaster_type, severity, status,
        estimated_affected_population, evacuation_recommended, evacuation_mandatory,
        weather_related, source, confidence_level, predicted_duration
      ) VALUES (
        $1, ${createPoint(
          zone.center_lng,
          zone.center_lat
        )}, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      ) RETURNING 
        id, name, ST_Y(center_point) as center_lat, ST_X(center_point) as center_lng,
        disaster_type, severity, status, estimated_affected_population,
        evacuation_recommended, evacuation_mandatory, weather_related,
        source, confidence_level, predicted_duration, created_at, updated_at, resolved_at
    `

    const values = [
      zone.name,
      zone.disaster_type,
      zone.severity,
      zone.status,
      zone.estimated_affected_population,
      zone.evacuation_recommended,
      zone.evacuation_mandatory,
      zone.weather_related,
      zone.source,
      zone.confidence_level,
      zone.predicted_duration,
    ]

    const result = await pool.query(query, values)
    return result.rows[0]
  },
}

// Weather Alert database operations
export const weatherAlertQueries = {
  // Create new weather alert
  create: async (
    alert: Omit<WeatherAlert, 'id' | 'created_at'>
  ): Promise<WeatherAlert> => {
    const query = `
      INSERT INTO weather_alerts (
        location, event_type, severity, description, start_time, end_time,
        weather_data, source, alert_id, affected_population
      ) VALUES (
        ${createPoint(
          alert.location_lng,
          alert.location_lat
        )}, $1, $2, $3, $4, $5, $6, $7, $8, $9
      ) RETURNING 
        id, ST_Y(location) as location_lat, ST_X(location) as location_lng,
        event_type, severity, description, start_time, end_time,
        weather_data, source, alert_id, affected_population, created_at
    `

    const values = [
      alert.event_type,
      alert.severity,
      alert.description,
      alert.start_time,
      alert.end_time,
      alert.weather_data ? JSON.stringify(alert.weather_data) : null,
      alert.source,
      alert.alert_id,
      alert.affected_population,
    ]

    const result = await pool.query(query, values)
    return result.rows[0]
  },

  // Get active weather alerts
  getActive: async (): Promise<WeatherAlert[]> => {
    const query = `
      SELECT 
        id, ST_Y(location) as location_lat, ST_X(location) as location_lng,
        event_type, severity, description, start_time, end_time,
        weather_data, source, alert_id, affected_population, created_at
      FROM weather_alerts 
      WHERE (end_time IS NULL OR end_time > CURRENT_TIMESTAMP)
      ORDER BY severity DESC, start_time DESC
    `

    const result = await pool.query(query)
    return result.rows
  },

  // Get nearby weather alerts
  getNearby: async (
    lat: number,
    lng: number,
    radiusKm: number = 100
  ): Promise<WeatherAlert[]> => {
    const query = `
      SELECT 
        id, ST_Y(location) as location_lat, ST_X(location) as location_lng,
        event_type, severity, description, start_time, end_time,
        weather_data, source, alert_id, affected_population, created_at
      FROM weather_alerts 
      WHERE ST_DWithin(
        location::geography,
        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
        $3 * 1000
      )
      AND (end_time IS NULL OR end_time > CURRENT_TIMESTAMP)
      ORDER BY ST_Distance(
        location::geography,
        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
      )
    `

    const result = await pool.query(query, [lat, lng, radiusKm])
    return result.rows
  },
}

// Initialize database connection
export const initializeDatabase = async (): Promise<boolean> => {
  try {
    console.log('🔌 Connecting to database...')
    const isConnected = await checkDatabaseConnection()

    if (isConnected) {
      // Check if PostGIS extension is available
      const result = await pool.query(
        "SELECT 1 FROM pg_extension WHERE extname = 'postgis'"
      )

      if (result.rows.length === 0) {
        console.warn(
          '⚠️  PostGIS extension not found. Spatial queries may not work.'
        )
      } else {
        console.log('✅ PostGIS extension is available')
      }

      return true
    }

    return false
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    return false
  }
}

// Graceful shutdown
export const closeDatabase = async (): Promise<void> => {
  try {
    await pool.end()
    console.log('✅ Database connection closed')
  } catch (error) {
    console.error('❌ Error closing database connection:', error)
  }
}

// Export pool for direct queries if needed
export default pool
