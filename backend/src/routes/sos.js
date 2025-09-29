const express = require('express')
const {
  sosAlertQueries,
  shelterQueries,
  disasterZoneQueries,
  weatherAlertQueries,
} = require('../database')
const { handleSOSNotification } = require('../services/notifications')
const router = express.Router()

// Mock database fallback for when database is not available
let sosAlerts = []
let alertIdCounter = 1

// Create new SOS alert
router.post('/alert', async (req, res) => {
  try {
    const {
      location,
      description,
      urgency = 'high',
      contactInfo,
      additionalData,
      userId,
    } = req.body

    // Validate required fields
    if (!location || !location.lat || !location.lng) {
      return res.status(400).json({
        error: 'Missing required location data (lat, lng)',
      })
    }

    const lat = parseFloat(location.lat)
    const lng = parseFloat(location.lng)

    try {
      // Try to save to database first
      const dbAlert = {
        user_id: userId,
        location_lat: lat,
        location_lng: lng,
        location_accuracy: location.accuracy,
        description: description || 'Emergency assistance needed',
        urgency,
        status: 'active',
        contact_info: contactInfo || {},
        additional_data: additionalData || {},
      }

      const savedAlert = await sosAlertQueries.create(dbAlert)

      // Check if location is in disaster zone
      const disasterZones = await disasterZoneQueries.checkLocation(lat, lng)
      const inDisasterZone = disasterZones.length > 0

      // Get nearby shelters
      const nearbyShelters = await shelterQueries.getNearby(lat, lng, 25)

      console.log(
        `🚨 SOS ALERT SAVED TO DB: ${savedAlert.id} at ${lat}, ${lng}${
          inDisasterZone ? ' (IN DISASTER ZONE)' : ''
        }`
      )

      // Send notifications to emergency services
      handleSOSNotification(savedAlert, {
        language: req.body.language || 'en',
        includeNearbyInfo: true,
      })
        .then((notificationResult) => {
          console.log('Emergency services notification result:', {
            success: notificationResult.success,
            alertId: savedAlert.id,
            servicesNotified:
              notificationResult.emergencyServices?.alertsSent || 0,
          })
        })
        .catch((notificationError) => {
          console.error(
            'Failed to notify emergency services:',
            notificationError
          )
        })

      // Simulate emergency response assignment
      setTimeout(async () => {
        try {
          await sosAlertQueries.updateStatus(savedAlert.id, 'acknowledged')
          console.log(
            `📞 Alert ${savedAlert.id} acknowledged by emergency services`
          )
        } catch (err) {
          console.error('Failed to update alert status:', err)
        }
      }, 2000)

      res.status(201).json({
        success: true,
        alertId: savedAlert.id,
        message: 'SOS alert sent successfully',
        alert: {
          id: savedAlert.id,
          status: savedAlert.status,
          timestamp: savedAlert.created_at,
          estimatedResponse: inDisasterZone ? '3-10 minutes' : '5-15 minutes',
          location: { lat, lng },
          urgency: savedAlert.urgency,
        },
        inDisasterZone,
        disasterZones,
        nearbyShelters: nearbyShelters.slice(0, 5),
      })
    } catch (dbError) {
      console.warn(
        'Database unavailable, falling back to in-memory storage:',
        dbError.message
      )

      // Fallback to in-memory storage
      const alert = {
        id: alertIdCounter++,
        location: {
          lat,
          lng,
          accuracy: location.accuracy || null,
          address: location.address || null,
        },
        description: description || 'Emergency assistance needed',
        urgency,
        contactInfo: contactInfo || {},
        additionalData: additionalData || {},
        status: 'active',
        timestamp: new Date().toISOString(),
        acknowledged: false,
        responderAssigned: null,
        estimatedResponse: null,
      }

      sosAlerts.push(alert)

      console.log(
        `🚨 SOS ALERT STORED IN MEMORY: ${alert.id} at ${lat}, ${lng}`
      )

      setTimeout(() => {
        alert.acknowledged = true
        alert.estimatedResponse = '8-12 minutes'
        console.log(`📞 Alert ${alert.id} acknowledged by emergency services`)
      }, 2000)

      res.status(201).json({
        success: true,
        alertId: alert.id,
        message: 'SOS alert sent successfully',
        alert: {
          id: alert.id,
          status: alert.status,
          timestamp: alert.timestamp,
          estimatedResponse: '5-15 minutes',
        },
        source: 'memory',
      })
    }
  } catch (error) {
    console.error('SOS Alert error:', error)
    res.status(500).json({
      error: 'Failed to process SOS alert',
      message: error.message,
    })
  }
})

// Get alert status
router.get('/alert/:alertId', (req, res) => {
  try {
    const { alertId } = req.params
    const alert = sosAlerts.find((a) => a.id === parseInt(alertId))

    if (!alert) {
      return res.status(404).json({
        error: 'Alert not found',
      })
    }

    res.json({
      id: alert.id,
      status: alert.status,
      acknowledged: alert.acknowledged,
      responderAssigned: alert.responderAssigned,
      estimatedResponse: alert.estimatedResponse,
      timestamp: alert.timestamp,
    })
  } catch (error) {
    console.error('Get alert status error:', error)
    res.status(500).json({
      error: 'Failed to get alert status',
      message: error.message,
    })
  }
})

// Update alert status (for emergency services)
router.patch('/alert/:alertId', (req, res) => {
  try {
    const { alertId } = req.params
    const { status, responderAssigned, estimatedResponse } = req.body

    const alert = sosAlerts.find((a) => a.id === parseInt(alertId))

    if (!alert) {
      return res.status(404).json({
        error: 'Alert not found',
      })
    }

    // Update alert
    if (status) alert.status = status
    if (responderAssigned) alert.responderAssigned = responderAssigned
    if (estimatedResponse) alert.estimatedResponse = estimatedResponse

    alert.lastUpdated = new Date().toISOString()

    res.json({
      success: true,
      message: 'Alert updated successfully',
      alert: {
        id: alert.id,
        status: alert.status,
        responderAssigned: alert.responderAssigned,
        estimatedResponse: alert.estimatedResponse,
        lastUpdated: alert.lastUpdated,
      },
    })
  } catch (error) {
    console.error('Update alert error:', error)
    res.status(500).json({
      error: 'Failed to update alert',
      message: error.message,
    })
  }
})

// Get nearby active alerts (for heatmap)
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 50 } = req.query

    if (!lat || !lng) {
      return res.status(400).json({
        error: 'Missing required parameters: lat, lng',
      })
    }

    const userLat = parseFloat(lat)
    const userLng = parseFloat(lng)
    const searchRadius = parseFloat(radius)

    try {
      // Try database first
      const dbAlerts = await sosAlertQueries.getNearby(
        userLat,
        userLng,
        searchRadius
      )

      const nearbyAlerts = dbAlerts.map((alert) => ({
        id: alert.id,
        location: { lat: alert.location_lat, lng: alert.location_lng },
        urgency: alert.urgency,
        timestamp: alert.created_at,
        status: alert.status,
        description: alert.description,
      }))

      res.json({
        alerts: nearbyAlerts,
        count: nearbyAlerts.length,
        searchRadius,
        center: { lat: userLat, lng: userLng },
        source: 'database',
      })
    } catch (dbError) {
      console.warn(
        'Database query failed, using in-memory storage:',
        dbError.message
      )

      // Fallback to in-memory storage
      const nearbyAlerts = sosAlerts
        .filter((alert) => alert.status === 'active')
        .filter((alert) => {
          const distance = calculateDistance(
            userLat,
            userLng,
            alert.location.lat,
            alert.location.lng
          )
          return distance <= searchRadius
        })
        .map((alert) => ({
          id: alert.id,
          location: alert.location,
          urgency: alert.urgency,
          timestamp: alert.timestamp,
          status: alert.status,
        }))

      res.json({
        alerts: nearbyAlerts,
        count: nearbyAlerts.length,
        searchRadius,
        center: { lat: userLat, lng: userLng },
        source: 'memory',
      })
    }
  } catch (error) {
    console.error('Nearby alerts error:', error)
    res.status(500).json({
      error: 'Failed to get nearby alerts',
      message: error.message,
    })
  }
})

// Get nearby emergency shelters
router.get('/shelters', async (req, res) => {
  try {
    const { lat, lng, radius = 50 } = req.query

    if (!lat || !lng) {
      return res.status(400).json({
        error: 'Missing required parameters: lat, lng',
      })
    }

    const shelters = await shelterQueries.getNearby(
      parseFloat(lat),
      parseFloat(lng),
      parseFloat(radius)
    )

    res.json({
      success: true,
      shelters,
      count: shelters.length,
      center: { lat: parseFloat(lat), lng: parseFloat(lng) },
    })
  } catch (error) {
    console.error('Error fetching shelters:', error)
    res.status(500).json({
      error: 'Failed to fetch emergency shelters',
      message: error.message,
    })
  }
})

// Check disaster zones for location
router.get('/disaster-zones', async (req, res) => {
  try {
    const { lat, lng } = req.query

    let zones
    if (lat && lng) {
      zones = await disasterZoneQueries.checkLocation(
        parseFloat(lat),
        parseFloat(lng)
      )
    } else {
      zones = await disasterZoneQueries.getActive()
    }

    res.json({
      success: true,
      zones,
      count: zones.length,
      inDisasterZone: lat && lng ? zones.length > 0 : undefined,
    })
  } catch (error) {
    console.error('Error fetching disaster zones:', error)
    res.status(500).json({
      error: 'Failed to fetch disaster zones',
      message: error.message,
    })
  }
})

// Get weather alerts
router.get('/weather-alerts', async (req, res) => {
  try {
    const { lat, lng, radius = 100 } = req.query

    let alerts
    if (lat && lng) {
      alerts = await weatherAlertQueries.getNearby(
        parseFloat(lat),
        parseFloat(lng),
        parseFloat(radius)
      )
    } else {
      alerts = await weatherAlertQueries.getActive()
    }

    res.json({
      success: true,
      alerts,
      count: alerts.length,
    })
  } catch (error) {
    console.error('Error fetching weather alerts:', error)
    res.status(500).json({
      error: 'Failed to fetch weather alerts',
      message: error.message,
    })
  }
})

// Update alert status (for emergency responders)
router.patch('/alert/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const { status, responderId } = req.body

    if (
      ![
        'active',
        'acknowledged',
        'responding',
        'resolved',
        'false_alarm',
      ].includes(status)
    ) {
      return res.status(400).json({
        error: 'Invalid status',
        details:
          'Status must be one of: active, acknowledged, responding, resolved, false_alarm',
      })
    }

    try {
      const updatedAlert = await sosAlertQueries.updateStatus(
        parseInt(id),
        status,
        responderId
      )

      if (!updatedAlert) {
        return res.status(404).json({
          error: 'Alert not found',
        })
      }

      res.json({
        success: true,
        alert: updatedAlert,
      })
    } catch (dbError) {
      console.warn('Database update failed, trying in-memory:', dbError.message)

      // Fallback to in-memory update
      const alert = sosAlerts.find((a) => a.id === parseInt(id))
      if (!alert) {
        return res.status(404).json({
          error: 'Alert not found',
        })
      }

      alert.status = status
      alert.responderAssigned = responderId
      alert.lastUpdated = new Date().toISOString()

      res.json({
        success: true,
        alert,
        source: 'memory',
      })
    }
  } catch (error) {
    console.error('Error updating alert status:', error)
    res.status(500).json({
      error: 'Failed to update alert status',
      message: error.message,
    })
  }
})

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

module.exports = router
