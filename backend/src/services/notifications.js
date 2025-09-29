const twilio = require('twilio')
const { sosAlertQueries, shelterQueries } = require('../database')

// Twilio configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER
const EMERGENCY_DISPATCH_NUMBERS = (
  process.env.EMERGENCY_DISPATCH_NUMBERS || ''
)
  .split(',')
  .filter((n) => n.trim())

// Initialize Twilio client
let twilioClient = null
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  console.log('✅ Twilio client initialized')
} else {
  console.warn('⚠️  Twilio credentials not found. SMS notifications disabled.')
}

// Emergency service contact numbers (South African emergency services)
const EMERGENCY_SERVICES = {
  police: '+27101111', // SAPS Emergency
  medical: '+27101177', // EMS
  fire: '+27101177', // Fire & Rescue
  disaster: '+27215901900', // Disaster Management (Cape Town)
}

// Multi-language emergency message templates
const EMERGENCY_MESSAGES = {
  en: {
    sosAlert: (alert) =>
      `🚨 EMERGENCY ALERT\n` +
      `Location: ${alert.location_lat}, ${alert.location_lng}\n` +
      `Urgency: ${alert.urgency.toUpperCase()}\n` +
      `Description: ${alert.description || 'Emergency assistance needed'}\n` +
      `Time: ${new Date(alert.created_at).toLocaleString()}\n` +
      `Contact: ${alert.contact_info?.phone || 'Not provided'}\n` +
      `Alert ID: ${alert.id}`,

    statusUpdate: (alert, newStatus) =>
      `📞 Alert Update - ID: ${alert.id}\n` +
      `Status: ${newStatus.toUpperCase()}\n` +
      `Location: ${alert.location_lat}, ${alert.location_lng}\n` +
      `Time: ${new Date().toLocaleString()}`,

    shelterInfo: (shelters) =>
      `🏠 Nearby Emergency Shelters:\n` +
      shelters
        .slice(0, 3)
        .map(
          (s) =>
            `${s.name}: ${s.distance_km.toFixed(1)}km away\n` +
            `Capacity: ${s.available_space}/${s.capacity}\n` +
            `Contact: ${s.contact_phone || 'N/A'}`
        )
        .join('\n\n'),

    disasterWarning: (zone) =>
      `⚠️ DISASTER ZONE WARNING\n` +
      `Type: ${zone.disaster_type.toUpperCase()}\n` +
      `Severity: ${zone.severity.toUpperCase()}\n` +
      `${
        zone.evacuation_mandatory
          ? '🚨 MANDATORY EVACUATION'
          : zone.evacuation_recommended
          ? '⚠️ EVACUATION RECOMMENDED'
          : ''
      }\n` +
      `Zone: ${zone.name || 'Unnamed zone'}`,
  },

  zu: {
    sosAlert: (alert) =>
      `🚨 ISEXWAYISO\n` +
      `Indawo: ${alert.location_lat}, ${alert.location_lng}\n` +
      `Ukuphuthuma: ${alert.urgency.toUpperCase()}\n` +
      `Incazelo: ${alert.description || 'Kudingeka usizo lwephuthuma'}\n` +
      `Isikhathi: ${new Date(alert.created_at).toLocaleString()}\n` +
      `Ukuxhumana: ${alert.contact_info?.phone || 'Akukho'}\n` +
      `I-ID yesexwayiso: ${alert.id}`,

    statusUpdate: (alert, newStatus) =>
      `📞 Isibuyekezo Sesexwayiso - ID: ${alert.id}\n` +
      `Isimo: ${newStatus.toUpperCase()}\n` +
      `Indawo: ${alert.location_lat}, ${alert.location_lng}\n` +
      `Isikhathi: ${new Date().toLocaleString()}`,

    shelterInfo: (shelters) =>
      `🏠 Iziphephelo Zephuthuma Eziseduze:\n` +
      shelters
        .slice(0, 3)
        .map(
          (s) =>
            `${s.name}: ${s.distance_km.toFixed(1)}km kude\n` +
            `Ububanzi: ${s.available_space}/${s.capacity}\n` +
            `Ukuxhumana: ${s.contact_phone || 'Akukho'}`
        )
        .join('\n\n'),

    disasterWarning: (zone) =>
      `⚠️ ISEXWAYISO SENHLEKELELE\n` +
      `Uhlobo: ${zone.disaster_type.toUpperCase()}\n` +
      `Ubukhali: ${zone.severity.toUpperCase()}\n` +
      `${
        zone.evacuation_mandatory
          ? '🚨 UKUPHUMA OKUPHOQELEKILE'
          : zone.evacuation_recommended
          ? '⚠️ KUNCONYWA UKUPHUMA'
          : ''
      }\n` +
      `Indawo: ${zone.name || 'Indawo engenagama'}`,
  },

  xh: {
    sosAlert: (alert) =>
      `🚨 ILISO LEXESHA LINGXAMISEKO\n` +
      `Indawo: ${alert.location_lat}, ${alert.location_lng}\n` +
      `Ukungxamiseka: ${alert.urgency.toUpperCase()}\n` +
      `Inkcazo: ${
        alert.description || 'Kufuneka uncedo lwexesha lingxamiseko'
      }\n` +
      `Ixesha: ${new Date(alert.created_at).toLocaleString()}\n` +
      `Unxibelelwano: ${alert.contact_info?.phone || 'Akukho'}\n` +
      `I-ID yeliso: ${alert.id}`,

    statusUpdate: (alert, newStatus) =>
      `📞 Uhlaziyo Loliso - ID: ${alert.id}\n` +
      `Imeko: ${newStatus.toUpperCase()}\n` +
      `Indawo: ${alert.location_lat}, ${alert.location_lng}\n` +
      `Ixesha: ${new Date().toLocaleString()}`,

    shelterInfo: (shelters) =>
      `🏠 Iindawo Zokhuseleko Ezikufutshane:\n` +
      shelters
        .slice(0, 3)
        .map(
          (s) =>
            `${s.name}: ${s.distance_km.toFixed(1)}km ukusuka\n` +
            `Umthamo: ${s.available_space}/${s.capacity}\n` +
            `Unxibelelwano: ${s.contact_phone || 'Akukho'}`
        )
        .join('\n\n'),

    disasterWarning: (zone) =>
      `⚠️ ISILUMKISO SENTLEKELE\n` +
      `Uhlobo: ${zone.disaster_type.toUpperCase()}\n` +
      `Ubunzima: ${zone.severity.toUpperCase()}\n` +
      `${
        zone.evacuation_mandatory
          ? '🚨 UKUFUDUKA OKUNYANZELEKILEYO'
          : zone.evacuation_recommended
          ? '⚠️ KUYACETYISWA UKUFUDUKA'
          : ''
      }\n` +
      `Indawo: ${zone.name || 'Indawo engenagama'}`,
  },

  af: {
    sosAlert: (alert) =>
      `🚨 NOODGEVAL WAARSKUWING\n` +
      `Ligging: ${alert.location_lat}, ${alert.location_lng}\n` +
      `Dringendheid: ${alert.urgency.toUpperCase()}\n` +
      `Beskrywing: ${alert.description || 'Noodhulp benodig'}\n` +
      `Tyd: ${new Date(alert.created_at).toLocaleString()}\n` +
      `Kontak: ${alert.contact_info?.phone || 'Nie verskaf nie'}\n` +
      `Waarskuwing ID: ${alert.id}`,

    statusUpdate: (alert, newStatus) =>
      `📞 Waarskuwing Opdatering - ID: ${alert.id}\n` +
      `Status: ${newStatus.toUpperCase()}\n` +
      `Ligging: ${alert.location_lat}, ${alert.location_lng}\n` +
      `Tyd: ${new Date().toLocaleString()}`,

    shelterInfo: (shelters) =>
      `🏠 Naby Noodskuilings:\n` +
      shelters
        .slice(0, 3)
        .map(
          (s) =>
            `${s.name}: ${s.distance_km.toFixed(1)}km weg\n` +
            `Kapasiteit: ${s.available_space}/${s.capacity}\n` +
            `Kontak: ${s.contact_phone || 'Nie beskikbaar'}`
        )
        .join('\n\n'),

    disasterWarning: (zone) =>
      `⚠️ RAMP WAARSKUWING\n` +
      `Tipe: ${zone.disaster_type.toUpperCase()}\n` +
      `Ernst: ${zone.severity.toUpperCase()}\n` +
      `${
        zone.evacuation_mandatory
          ? '🚨 VERPLIGTE ONTRUIMING'
          : zone.evacuation_recommended
          ? '⚠️ ONTRUIMING AANBEVEEL'
          : ''
      }\n` +
      `Gebied: ${zone.name || 'Naamlose gebied'}`,
  },
}

// Send SMS notification
const sendSMS = async (to, message, language = 'en') => {
  if (!twilioClient) {
    console.warn('Twilio not configured. SMS not sent:', {
      to,
      message: message.substring(0, 50) + '...',
    })
    return { success: false, error: 'Twilio not configured' }
  }

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: to,
    })

    console.log(`✅ SMS sent to ${to}: ${result.sid}`)
    return { success: true, messageId: result.sid }
  } catch (error) {
    console.error(`❌ Failed to send SMS to ${to}:`, error)
    return { success: false, error: error.message }
  }
}

// Send emergency alert to dispatch services
const notifyEmergencyServices = async (alert, language = 'en') => {
  if (!EMERGENCY_DISPATCH_NUMBERS.length) {
    console.warn('No emergency dispatch numbers configured')
    return { success: false, error: 'No dispatch numbers configured' }
  }

  const message =
    EMERGENCY_MESSAGES[language]?.sosAlert(alert) ||
    EMERGENCY_MESSAGES.en.sosAlert(alert)
  const results = []

  for (const number of EMERGENCY_DISPATCH_NUMBERS) {
    const result = await sendSMS(number.trim(), message, language)
    results.push({ number: number.trim(), ...result })
  }

  return {
    success: results.some((r) => r.success),
    results,
    alertsSent: results.filter((r) => r.success).length,
    totalNumbers: EMERGENCY_DISPATCH_NUMBERS.length,
  }
}

// Send status update notification
const notifyStatusUpdate = async (
  alert,
  newStatus,
  phoneNumbers = [],
  language = 'en'
) => {
  if (!phoneNumbers.length) {
    return { success: false, error: 'No phone numbers provided' }
  }

  const message =
    EMERGENCY_MESSAGES[language]?.statusUpdate(alert, newStatus) ||
    EMERGENCY_MESSAGES.en.statusUpdate(alert, newStatus)
  const results = []

  for (const number of phoneNumbers) {
    const result = await sendSMS(number, message, language)
    results.push({ number, ...result })
  }

  return {
    success: results.some((r) => r.success),
    results,
    notificationsSent: results.filter((r) => r.success).length,
  }
}

// Send shelter information
const sendShelterInfo = async (phoneNumber, shelters, language = 'en') => {
  if (!shelters.length) {
    return { success: false, error: 'No shelters to notify about' }
  }

  const message =
    EMERGENCY_MESSAGES[language]?.shelterInfo(shelters) ||
    EMERGENCY_MESSAGES.en.shelterInfo(shelters)

  return await sendSMS(phoneNumber, message, language)
}

// Send disaster zone warning
const sendDisasterWarning = async (phoneNumbers, zone, language = 'en') => {
  if (!phoneNumbers.length) {
    return { success: false, error: 'No phone numbers provided' }
  }

  const message =
    EMERGENCY_MESSAGES[language]?.disasterWarning(zone) ||
    EMERGENCY_MESSAGES.en.disasterWarning(zone)
  const results = []

  for (const number of phoneNumbers) {
    const result = await sendSMS(number, message, language)
    results.push({ number, ...result })
  }

  return {
    success: results.some((r) => r.success),
    results,
    warningsSent: results.filter((r) => r.success).length,
  }
}

// Send mass emergency broadcast
const sendEmergencyBroadcast = async (
  message,
  phoneNumbers,
  language = 'en'
) => {
  if (!phoneNumbers.length) {
    return { success: false, error: 'No phone numbers provided' }
  }

  const results = []
  const batchSize = 10 // Send in batches to avoid rate limiting

  for (let i = 0; i < phoneNumbers.length; i += batchSize) {
    const batch = phoneNumbers.slice(i, i + batchSize)
    const batchPromises = batch.map((number) =>
      sendSMS(number, message, language)
    )

    const batchResults = await Promise.allSettled(batchPromises)

    batchResults.forEach((result, index) => {
      const number = batch[index]
      if (result.status === 'fulfilled') {
        results.push({ number, ...result.value })
      } else {
        results.push({ number, success: false, error: result.reason.message })
      }
    })

    // Rate limiting: wait 1 second between batches
    if (i + batchSize < phoneNumbers.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  return {
    success: results.some((r) => r.success),
    results,
    broadcastsSent: results.filter((r) => r.success).length,
    totalNumbers: phoneNumbers.length,
  }
}

// Enhanced SOS alert notification with context
const handleSOSNotification = async (alert, options = {}) => {
  const { language = 'en', includeNearbyInfo = true } = options

  try {
    // Primary notification to emergency services
    const emergencyResult = await notifyEmergencyServices(alert, language)

    let contextualInfo = {}

    if (includeNearbyInfo) {
      try {
        // Get nearby shelters for additional context
        const nearbyShelters = await shelterQueries.getNearby(
          alert.location_lat,
          alert.location_lng,
          25
        )

        contextualInfo.nearbyShelters = nearbyShelters.slice(0, 3)

        // If user provided contact info, send them shelter information
        if (alert.contact_info?.phone && nearbyShelters.length > 0) {
          await sendShelterInfo(
            alert.contact_info.phone,
            nearbyShelters,
            language
          )
        }
      } catch (error) {
        console.warn('Could not fetch contextual information:', error.message)
      }
    }

    return {
      success: emergencyResult.success,
      emergencyServices: emergencyResult,
      contextualInfo,
      alert: {
        id: alert.id,
        location: { lat: alert.location_lat, lng: alert.location_lng },
        urgency: alert.urgency,
        timestamp: alert.created_at,
      },
    }
  } catch (error) {
    console.error('SOS notification failed:', error)
    return {
      success: false,
      error: error.message,
      alert: { id: alert.id },
    }
  }
}

// Test notification system
const testNotificationSystem = async () => {
  if (!twilioClient) {
    return { success: false, error: 'Twilio not configured' }
  }

  try {
    const testMessage = '🧪 CrisisLink Test - Notification system operational'
    const testNumber = process.env.TEST_PHONE_NUMBER

    if (!testNumber) {
      console.warn('No test phone number configured')
      return { success: false, error: 'No test phone number' }
    }

    const result = await sendSMS(testNumber, testMessage)
    return { success: result.success, tested: true, ...result }
  } catch (error) {
    return { success: false, error: error.message, tested: true }
  }
}

module.exports = {
  sendSMS,
  notifyEmergencyServices,
  notifyStatusUpdate,
  sendShelterInfo,
  sendDisasterWarning,
  sendEmergencyBroadcast,
  handleSOSNotification,
  testNotificationSystem,
  EMERGENCY_SERVICES,
  EMERGENCY_MESSAGES,
}
