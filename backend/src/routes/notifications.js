const express = require('express')
const rateLimit = require('express-rate-limit')
const {
  sendSMS,
  notifyEmergencyServices,
  notifyStatusUpdate,
  sendShelterInfo,
  sendDisasterWarning,
  sendEmergencyBroadcast,
  handleSOSNotification,
  testNotificationSystem,
  EMERGENCY_SERVICES,
} = require('../services/notifications')
const {
  sosAlertQueries,
  shelterQueries,
  disasterZoneQueries,
} = require('../database')

const router = express.Router()

// Rate limiting for notification endpoints
const notificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message:
    'Too many notification requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
})

const emergencyBroadcastLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit emergency broadcasts
  message: 'Emergency broadcast limit exceeded. Please contact administrator.',
  standardHeaders: true,
  legacyHeaders: false,
})

// Apply rate limiting to all notification routes
router.use(notificationLimiter)

// Test notification system
router.post('/test', async (req, res) => {
  try {
    const result = await testNotificationSystem()

    res.json({
      success: result.success,
      message: result.success
        ? 'Test notification sent successfully'
        : 'Test notification failed',
      details: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Test notification error:', error)
    res.status(500).json({
      error: 'Failed to test notification system',
      message: error.message,
    })
  }
})

// Send manual SMS (for administrators) - backward compatible with existing /send endpoint
router.post('/send', async (req, res) => {
  try {
    const { to, message, recipients, language = 'en' } = req.body

    // Handle both old format (recipients array) and new format (single to)
    const phoneNumbers = to ? [to] : recipients || []

    if (!phoneNumbers.length || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Both phone numbers and message are required',
      })
    }

    let successCount = 0
    const results = []

    for (const phoneNumber of phoneNumbers) {
      const result = await sendSMS(phoneNumber, message, language)
      results.push({ phoneNumber, ...result })
      if (result.success) successCount++
    }

    res.json({
      success: successCount > 0,
      message: `SMS sent to ${successCount} of ${phoneNumbers.length} recipients`,
      sentTo: successCount,
      details: results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('SMS sending error:', error)
    res.status(500).json({
      error: 'Failed to send SMS',
      message: error.message,
    })
  }
})

// Notify emergency services about an alert
router.post('/emergency-alert/:alertId', async (req, res) => {
  try {
    const { alertId } = req.params
    const { language = 'en', includeNearbyInfo = true } = req.body

    // Get alert from database
    const alert = await sosAlertQueries.getById(parseInt(alertId))

    if (!alert) {
      return res.status(404).json({
        error: 'Alert not found',
        alertId,
      })
    }

    const result = await handleSOSNotification(alert, {
      language,
      includeNearbyInfo,
    })

    res.json({
      success: result.success,
      message: result.success
        ? 'Emergency services notified successfully'
        : 'Failed to notify emergency services',
      details: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Emergency alert notification error:', error)
    res.status(500).json({
      error: 'Failed to notify emergency services',
      message: error.message,
    })
  }
})

// Send shelter information
router.post('/shelter-info', async (req, res) => {
  try {
    const { phoneNumber, lat, lng, language = 'en', radius = 25 } = req.body

    if (!phoneNumber || !lat || !lng) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'phoneNumber, lat, and lng are required',
      })
    }

    // Get nearby shelters
    const shelters = await shelterQueries.getNearby(
      parseFloat(lat),
      parseFloat(lng),
      parseFloat(radius)
    )

    if (shelters.length === 0) {
      return res.json({
        success: false,
        message: 'No shelters found in the specified area',
        searchRadius: radius,
        location: { lat: parseFloat(lat), lng: parseFloat(lng) },
      })
    }

    const result = await sendShelterInfo(phoneNumber, shelters, language)

    res.json({
      success: result.success,
      message: result.success
        ? `Shelter information sent to ${phoneNumber}`
        : 'Failed to send shelter information',
      sheltersFound: shelters.length,
      details: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Shelter info notification error:', error)
    res.status(500).json({
      error: 'Failed to send shelter information',
      message: error.message,
    })
  }
})

// Send emergency broadcast (highly restricted)
router.post(
  '/emergency-broadcast',
  emergencyBroadcastLimiter,
  async (req, res) => {
    try {
      const { message, phoneNumbers, language = 'en', adminKey } = req.body

      // Simple admin key check (in production, use proper authentication)
      const ADMIN_KEY =
        process.env.EMERGENCY_BROADCAST_ADMIN_KEY || 'emergency-admin-2023'
      if (adminKey !== ADMIN_KEY) {
        return res.status(403).json({
          error: 'Unauthorized',
          message: 'Valid admin key required for emergency broadcasts',
        })
      }

      if (!message || !phoneNumbers || !Array.isArray(phoneNumbers)) {
        return res.status(400).json({
          error: 'Missing required fields',
          details: 'message and phoneNumbers (array) are required',
        })
      }

      const result = await sendEmergencyBroadcast(
        message,
        phoneNumbers,
        language
      )

      // Log emergency broadcast for audit
      console.log(`🚨 EMERGENCY BROADCAST SENT:`, {
        message: message.substring(0, 100) + '...',
        recipientCount: phoneNumbers.length,
        successCount: result.broadcastsSent,
        timestamp: new Date().toISOString(),
        ip: req.ip,
      })

      res.json({
        success: result.success,
        message: `Emergency broadcast sent to ${
          result.broadcastsSent || 0
        } of ${result.totalNumbers} numbers`,
        details: result,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Emergency broadcast error:', error)
      res.status(500).json({
        error: 'Failed to send emergency broadcast',
        message: error.message,
      })
    }
  }
)

// Get notification system status
router.get('/status', (req, res) => {
  try {
    const twilioConfigured = !!(
      process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    )
    const emergencyNumbers = (process.env.EMERGENCY_DISPATCH_NUMBERS || '')
      .split(',')
      .filter((n) => n.trim())

    res.json({
      success: true,
      status: {
        twilioConfigured,
        emergencyNumbersConfigured: emergencyNumbers.length,
        emergencyServices: Object.keys(EMERGENCY_SERVICES),
        supportedLanguages: ['en', 'zu', 'xh', 'af'],
        features: {
          smsNotifications: twilioConfigured,
          emergencyDispatch: twilioConfigured && emergencyNumbers.length > 0,
          multiLanguageSupport: true,
          massNotifications: twilioConfigured,
          shelterNotifications: true,
          disasterWarnings: twilioConfigured,
        },
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Status check error:', error)
    res.status(500).json({
      error: 'Failed to get notification system status',
      message: error.message,
    })
  }
})

// Get notification history (backward compatible)
router.get('/history', (req, res) => {
  // This would connect to database in production
  const notifications = [
    {
      id: 1,
      type: 'weather_alert',
      message: 'Severe thunderstorm warning for Johannesburg area',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      status: 'sent',
    },
    {
      id: 2,
      type: 'sos_alert',
      message: 'Emergency alert dispatched to responders',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      status: 'sent',
    },
  ]

  res.json({
    success: true,
    notifications,
    count: notifications.length,
  })
})

module.exports = router
