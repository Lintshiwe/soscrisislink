const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const compression = require('compression')
const cookieParser = require('cookie-parser')
const rateLimit = require('express-rate-limit')
const { createServer } = require('http')
const { Server } = require('socket.io')
const { initializeDatabase, closeDatabase } = require('./database')
require('dotenv').config({ path: '../.env' })

const app = express()
const httpServer = createServer(app)

// Socket.IO setup for real-time communication
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
})

// Security middleware
app.use(helmet())
app.use(compression())

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
)

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(limiter)

// Emergency SOS endpoint - higher rate limit
const sosLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Allow more SOS requests
  message: 'SOS rate limit exceeded. Please wait before sending another alert.',
  skip: (req) => req.ip === '127.0.0.1', // Skip rate limiting for localhost during development
})

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Logging
app.use(morgan('combined'))

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'CrisisLink API',
  })
})

// Routes
app.use('/api/auth', require('./routes/auth'))
app.use('/api/sos', sosLimiter, require('./routes/sos'))
app.use('/api/weather', require('./routes/weather'))
app.use('/api/locations', require('./routes/locations'))
app.use('/api/notifications', require('./routes/notifications'))
app.use('/api/resources', require('./routes/resources'))

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  // Join user to their location-based room
  socket.on('join-location', (locationData) => {
    const room = `location-${Math.floor(locationData.lat * 100)}-${Math.floor(
      locationData.lng * 100
    )}`
    socket.join(room)
    console.log(`User ${socket.id} joined location room: ${room}`)
  })

  // Handle SOS alerts
  socket.on('sos-alert', (alertData) => {
    // Broadcast to emergency responders
    socket.broadcast.emit('emergency-alert', {
      ...alertData,
      timestamp: new Date().toISOString(),
      socketId: socket.id,
    })
    console.log('SOS Alert broadcasted:', alertData)
  })

  // Handle weather alerts
  socket.on('weather-update', (weatherData) => {
    const room = `location-${Math.floor(weatherData.lat * 100)}-${Math.floor(
      weatherData.lng * 100
    )}`
    io.to(room).emit('weather-alert', weatherData)
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    error: 'Something went wrong!',
    message:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'Internal server error',
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `${req.method} ${req.originalUrl} not found`,
  })
})

const PORT = process.env.PORT || 3001

const startServer = async () => {
  // Initialize database connection
  const dbConnected = await initializeDatabase()
  if (!dbConnected) {
    console.error(
      '❌ Failed to connect to database. Server will run without persistence.'
    )
  }

  httpServer.listen(PORT, () => {
    console.log(`🚨 CrisisLink API Server running on port ${PORT}`)
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`)
    console.log(`📡 Socket.IO enabled for real-time communication`)
    console.log(`🗄️  Database: ${dbConnected ? 'Connected' : 'Disconnected'}`)
  })
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...')
  await closeDatabase()
  httpServer.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...')
  await closeDatabase()
  httpServer.close(() => {
    console.log('✅ Server closed')
    process.exit(0)
  })
})

startServer().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
