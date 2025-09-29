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
const pool = new Pool(dbConfig)

// In-memory storage for demo mode when database is not available
let demoAlerts = []
let demoShelters = [
  {
    id: 1,
    name: 'Johannesburg Community Center',
    location_lat: -26.2041,
    location_lng: 28.0473,
    address: 'City Center, Johannesburg',
    capacity: 500,
    current_occupancy: 150,
    available_space: 350,
    facilities: ['Medical', 'Food', 'Bedding', 'Showers'],
    contact_phone: '+27-11-123-4567',
    distance_km: 0.5,
    status: 'operational',
    pet_friendly: false,
    medical_facilities: true,
  },
  {
    id: 2,
    name: 'Cape Town Emergency Shelter',
    location_lat: -33.9249,
    location_lng: 18.4241,
    address: 'District Six, Cape Town',
    capacity: 300,
    current_occupancy: 75,
    available_space: 225,
    facilities: ['Medical', 'Food', 'Bedding'],
    contact_phone: '+27-21-123-4567',
    distance_km: 2.1,
    status: 'operational',
    pet_friendly: true,
    medical_facilities: true,
  },
]
let demoDisasterZones = []
let alertIdCounter = 1

// Database connection health check
const checkDatabaseConnection = async () => {
  try {
    const client = await pool.connect()
    await client.query('SELECT NOW()')
    client.release()
    console.log('✅ Database connection successful')
    return true
  } catch (error) {
    console.error(
      '❌ Database connection failed, using demo mode:',
      error.message
    )
    return false
  }
}

// Helper function to convert coordinates to PostGIS POINT
const createPoint = (lng, lat) => {
  return `ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)`
}

// SOS Alert database operations
const sosAlertQueries = {
  // Create new SOS alert
  create: async (alert) => {
    try {
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
    } catch (error) {
      // Fallback to demo mode when database is not available
      console.warn(
        'Database not available, using demo mode for SOS alert creation'
      )
      const demoAlert = {
        id: alertIdCounter++,
        user_id: alert.user_id,
        location_lat: alert.location_lat,
        location_lng: alert.location_lng,
        location_accuracy: alert.location_accuracy,
        description: alert.description,
        urgency: alert.urgency,
        status: alert.status,
        contact_info: alert.contact_info,
        additional_data: alert.additional_data,
        weather_conditions: alert.weather_conditions,
        responder_id: null,
        estimated_response_time: null,
        response_time: null,
        resolved_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      }
      demoAlerts.push(demoAlert)
      return demoAlert
    }
  },

  // Get nearby SOS alerts
  getNearby: async (lat, lng, radiusKm = 50) => {
    const result = await pool.query(
      'SELECT * FROM get_nearby_sos_alerts($1, $2, $3)',
      [lat, lng, radiusKm]
    )
    return result.rows
  },

  // Update SOS alert status
  updateStatus: async (id, status, responderId) => {
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
  getById: async (id) => {
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
  getActive: async () => {
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
const shelterQueries = {
  // Get nearby shelters
  getNearby: async (lat, lng, radiusKm = 50) => {
    try {
      const result = await pool.query(
        'SELECT * FROM get_nearby_shelters($1, $2, $3)',
        [lat, lng, radiusKm]
      )
      return result.rows
    } catch (error) {
      // Fallback to demo shelters
      console.warn('Database not available, using demo shelters')
      return demoShelters.map((shelter) => ({
        ...shelter,
        distance_km: Math.random() * radiusKm,
      }))
    }
  },

  // Get all operational shelters
  getOperational: async () => {
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
  updateOccupancy: async (id, occupancy) => {
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
const disasterZoneQueries = {
  // Check if point is in disaster zone
  checkLocation: async (lat, lng) => {
    try {
      const result = await pool.query(
        'SELECT * FROM is_in_disaster_zone($1, $2)',
        [lat, lng]
      )
      return result.rows
    } catch (error) {
      // Fallback to demo disaster zones (empty for now)
      console.warn('Database not available, using demo disaster zones')
      return demoDisasterZones
    }
  },

  // Get all active disaster zones
  getActive: async () => {
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
  create: async (zone) => {
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
const weatherAlertQueries = {
  // Create new weather alert
  create: async (alert) => {
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
  getActive: async () => {
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
  getNearby: async (lat, lng, radiusKm = 100) => {
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
const initializeDatabase = async () => {
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
const closeDatabase = async () => {
  try {
    await pool.end()
    console.log('✅ Database connection closed')
  } catch (error) {
    console.error('❌ Error closing database connection:', error)
  }
}

module.exports = {
  pool,
  checkDatabaseConnection,
  sosAlertQueries,
  shelterQueries,
  disasterZoneQueries,
  weatherAlertQueries,
  initializeDatabase,
  closeDatabase,
}
