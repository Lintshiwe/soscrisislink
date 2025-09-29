# CrisisLink Backend Infrastructure

## Overview

The CrisisLink backend is a comprehensive emergency response system built with Node.js, Express, and PostgreSQL with PostGIS for spatial data handling. It provides real-time emergency alert processing, multi-language SMS notifications via Twilio, and spatial queries for disaster zones, shelters, and evacuation routes.

## Architecture

### Core Components

1. **Express.js Server** - RESTful API with WebSocket support
2. **PostgreSQL with PostGIS** - Spatial database for location-based queries
3. **Twilio Integration** - SMS notifications in 4 South African languages
4. **Socket.IO** - Real-time communication for emergency dispatching
5. **Rate Limiting** - Protection against abuse and spam

### Database Schema

#### Core Tables

- `sos_alerts` - Emergency alerts with spatial location data
- `emergency_shelters` - Shelter locations with capacity information
- `disaster_zones` - Active disaster areas with evacuation requirements
- `weather_alerts` - Weather-related emergency notifications
- `users` - User authentication and preferences
- `notification_log` - Audit trail for all notifications sent

#### Spatial Functions

- `get_nearby_sos_alerts(lat, lng, radius)` - Find alerts within radius
- `get_nearby_shelters(lat, lng, radius)` - Find available shelters
- `is_in_disaster_zone(lat, lng)` - Check if location is in danger zone

## API Endpoints

### SOS Alerts (`/api/sos`)

#### POST `/api/sos/alert`

Create new emergency alert with automatic emergency service notification.

**Request Body:**

```json
{
  "location": {
    "lat": -26.2041,
    "lng": 28.0473,
    "accuracy": 10
  },
  "description": "Medical emergency - chest pain",
  "urgency": "critical",
  "contactInfo": {
    "phone": "+27123456789",
    "name": "John Doe"
  },
  "userId": 123,
  "language": "en"
}
```

**Response:**

```json
{
  "success": true,
  "alertId": 456,
  "message": "SOS alert sent successfully",
  "alert": {
    "id": 456,
    "status": "active",
    "timestamp": "2024-01-15T10:30:00Z",
    "estimatedResponse": "3-10 minutes",
    "location": { "lat": -26.2041, "lng": 28.0473 },
    "urgency": "critical"
  },
  "inDisasterZone": false,
  "disasterZones": [],
  "nearbyShelters": [...]
}
```

#### GET `/api/sos/nearby`

Get active alerts within specified radius for heatmap visualization.

**Query Parameters:**

- `lat` (required) - Latitude
- `lng` (required) - Longitude
- `radius` (optional) - Search radius in km (default: 50)

#### GET `/api/sos/shelters`

Find emergency shelters near location.

#### GET `/api/sos/disaster-zones`

Check for active disaster zones at location or get all active zones.

#### PATCH `/api/sos/alert/:id/status`

Update alert status (for emergency responders).

### Notifications (`/api/notifications`)

#### POST `/api/notifications/test`

Test notification system functionality.

#### POST `/api/notifications/send`

Send manual SMS notification (backward compatible).

**Request Body:**

```json
{
  "to": "+27123456789",
  "message": "Emergency shelter available at Community Center",
  "language": "zu"
}
```

#### POST `/api/notifications/emergency-alert/:alertId`

Trigger emergency service notifications for specific alert.

#### POST `/api/notifications/shelter-info`

Send shelter information to phone number based on location.

#### POST `/api/notifications/emergency-broadcast`

Send mass emergency broadcast (requires admin key).

#### GET `/api/notifications/status`

Get notification system status and capabilities.

## Environment Configuration

Create `.env` file in backend directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crisislink
DB_USER=postgres
DB_PASSWORD=your_password

# Twilio Configuration (for SMS notifications)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# Emergency Services Configuration
EMERGENCY_DISPATCH_NUMBERS=+27111111111,+27222222222,+27333333333
TEST_PHONE_NUMBER=+27123456789
EMERGENCY_BROADCAST_ADMIN_KEY=emergency-admin-2023

# Server Configuration
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Weather API (OpenWeatherMap)
WEATHER_API_KEY=your_openweather_api_key
```

## Database Setup

### 1. Install PostgreSQL with PostGIS

```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib postgis

# macOS with Homebrew
brew install postgresql postgis

# Windows - Use PostgreSQL installer with PostGIS extension
```

### 2. Create Database

```sql
CREATE DATABASE crisislink;
\c crisislink;
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;
```

### 3. Run Migrations

```bash
# Navigate to database directory
cd database

# Run migration script
psql -U postgres -d crisislink -f migrations/001_initial_schema.sql
```

## Installation & Deployment

### Development Setup

```bash
# Clone repository
git clone <repository-url>
cd SOSCrisisLink/backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### Production Deployment

```bash
# Install production dependencies
npm ci

# Start production server
npm start
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY src ./src
EXPOSE 3001

CMD ["node", "src/index.js"]
```

## Multi-Language Support

The system supports emergency notifications in 4 South African languages:

- **English (en)** - Default language
- **Zulu (zu)** - IsiZulu
- **Xhosa (xh)** - IsiXhosa
- **Afrikaans (af)**

### Message Templates

All emergency messages are automatically translated based on the `language` parameter:

```javascript
// English
'🚨 EMERGENCY ALERT\nLocation: -26.2041, 28.0473\nUrgency: CRITICAL'

// Zulu
'🚨 ISEXWAYISO\nIndawo: -26.2041, 28.0473\nUkuphuthuma: CRITICAL'

// Xhosa
'🚨 ILISO LEXESHA LINGXAMISEKO\nIndawo: -26.2041, 28.0473\nUkungxamiseka: CRITICAL'

// Afrikaans
'🚨 NOODGEVAL WAARSKUWING\nLigging: -26.2041, 28.0473\nDringendheid: CRITICAL'
```

## Rate Limiting & Security

### API Rate Limits

- General API: 100 requests per 15 minutes per IP
- SOS Alerts: 10 requests per 5 minutes per IP
- Notifications: 50 requests per 15 minutes per IP
- Emergency Broadcasts: 5 requests per hour per IP

### Security Features

- Helmet.js for security headers
- CORS configuration
- Request body size limits (10MB)
- SQL injection prevention with parameterized queries
- Input validation and sanitization

## Real-time Communication

### WebSocket Events

**Client → Server:**

```javascript
// Join location-based room for local alerts
socket.emit('join-location', { lat: -26.2041, lng: 28.0473 })

// Send SOS alert
socket.emit('sos-alert', alertData)

// Send weather update
socket.emit('weather-update', weatherData)
```

**Server → Client:**

```javascript
// Emergency alert broadcast
socket.emit('emergency:sos_alert', {
  id: 456,
  location: { latitude: -26.2041, longitude: 28.0473 },
  urgency: 'critical',
  message: '🚨 NEW SOS ALERT - Immediate Response Required',
  priority: 'CRITICAL',
  inDisasterZone: false,
  nearbyShelters: [...]
})

// Alert status update
socket.emit('emergency:alert_status_update', {
  alertId: 456,
  status: 'acknowledged',
  responderId: 789,
  timestamp: '2024-01-15T10:35:00Z'
})

// Weather alert for location
socket.emit('weather-alert', weatherData)
```

## Monitoring & Logging

### Health Check

```bash
curl http://localhost:3001/health
```

### Log Levels

- Emergency service notifications
- Database connection status
- Alert creation and status updates
- SMS delivery status
- Rate limiting violations
- System errors and warnings

## Performance Considerations

### Database Optimization

- Spatial indexes on location columns (GIST)
- Regular indexes on frequently queried fields
- Connection pooling (max 20 connections)
- Query timeout protection

### Caching Strategy

- In-memory fallback for database unavailability
- Connection pooling for database efficiency
- Rate limiting with Redis (recommended for production)

### Scalability

- Horizontal scaling with load balancer
- Database read replicas for heavy spatial queries
- Message queue for notification processing
- CDN for static assets

## Troubleshooting

### Common Issues

1. **Database Connection Failed**

   - Check PostgreSQL service status
   - Verify connection credentials in .env
   - Ensure PostGIS extension is installed

2. **SMS Notifications Not Working**

   - Verify Twilio credentials
   - Check phone number formatting (+country code)
   - Confirm Twilio account balance

3. **High Memory Usage**
   - Monitor connection pool size
   - Check for connection leaks
   - Review spatial query performance

### Debug Mode

```bash
DEBUG=crisislink:* npm run dev
```

## API Testing

### Curl Examples

```bash
# Create SOS Alert
curl -X POST http://localhost:3001/api/sos/alert \
  -H "Content-Type: application/json" \
  -d '{
    "location": {"lat": -26.2041, "lng": 28.0473},
    "description": "Medical emergency",
    "urgency": "high",
    "contactInfo": {"phone": "+27123456789"}
  }'

# Get nearby alerts
curl "http://localhost:3001/api/sos/nearby?lat=-26.2041&lng=28.0473&radius=25"

# Test notification system
curl -X POST http://localhost:3001/api/notifications/test

# Get system status
curl http://localhost:3001/api/notifications/status
```

## Contributing

1. Follow existing code style and patterns
2. Add comprehensive error handling
3. Include input validation for all endpoints
4. Write tests for new functionality
5. Update documentation for API changes

## License

This emergency response system is designed for humanitarian use in South African communities.
