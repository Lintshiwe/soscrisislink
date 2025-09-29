# 🚨 CrisisLink – Real-Time Disaster Rescue Platform

![GitHub contributors](https://img.shields.io/github/contributors/Lintshiwe/soscrisislink?style=for-the-badge)
![GitHub stars](https://img.shields.io/github/stars/Lintshiwe/soscrisislink?style=for-the-badge)
![GitHub forks](https://img.shields.io/github/forks/Lintshiwe/soscrisislink?style=for-the-badge)
![GitHub issues](https://img.shields.io/github/issues/Lintshiwe/soscrisislink?style=for-the-badge)
![GitHub license](https://img.shields.io/github/license/Lintshiwe/soscrisislink?style=for-the-badge)

[![Emergency Response](https://img.shields.io/badge/Emergency-Response-red?style=for-the-badge)](https://github.com/Lintshiwe/soscrisislink)
[![South Africa](https://img.shields.io/badge/Built%20for-South%20Africa-green?style=for-the-badge)](https://github.com/Lintshiwe/soscrisislink)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-blue?style=for-the-badge)](https://github.com/Lintshiwe/soscrisislink)

## 🧭 Mission

CrisisLink is a life-saving web application designed for South Africans facing extreme weather disasters. With one tap on a bold, central SOS button, users can instantly alert 24/7 emergency agents—sending their live location and situation details for rapid rescue.

## 🖥️ Key Features

- **🆘 One-Tap SOS**: Central glowing SOS button with auto-location sharing
- **🌩️ Weather Monitoring**: Real-time weather detection with "clowing" visual alerts
- **📍 GPS Integration**: Automatic location sharing with emergency dispatch
- **🗺️ Disaster Heatmap**: Live visualization of disaster zones and evacuation routes
- **📲 Offline Mode**: Works in low-connectivity areas
- **🌐 Multi-Language**: Support for Zulu, Xhosa, Afrikaans, and English

## 🛠️ Technical Stack

- **Frontend**: React.js with TypeScript
- **Backend**: Node.js + Express
- **Database**: PostgreSQL + PostGIS
- **Weather API**: OpenWeatherMap
- **Mapping**: Mapbox/Leaflet.js
- **Notifications**: WebSocket + Twilio
- **Hosting**: IBM Z + LinuxONE

## 📁 Project Structure

```
SOSCrisisLink/
├── frontend/          # React.js application
├── backend/           # Node.js API server
├── database/          # Database migrations and seeds
├── docs/              # Documentation
└── config/            # Configuration files
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

1. Clone the repository
2. Install frontend dependencies: `cd frontend && npm install`
3. Install backend dependencies: `cd backend && npm install`
4. Set up environment variables (see .env.example files)
5. Run database migrations: `npm run migrate`
6. Start development servers: `npm run dev`

## 🔐 Environment Variables

Create `.env` files in both frontend and backend directories. See `.env.example` for required variables.

## ✅ Implementation Status

### Completed Features

#### Frontend (React TypeScript)

- ✅ **Emergency SOS Interface**: One-tap SOS button with glowing animations
- ✅ **Weather Monitoring System**: Real-time alerts with "clowing" visual effects
- ✅ **Interactive Disaster Map**: Leaflet.js with custom markers and legends
- ✅ **Multi-Language Support**: UI in English, Zulu, Xhosa, Afrikaans
- ✅ **Side Panel Resources**: Collapsible emergency contacts and safety tips
- ✅ **Offline Service Worker**: Critical SOS functionality works offline
- ✅ **Responsive Design**: Mobile-first design with accessibility features

#### Backend Infrastructure (Node.js + PostgreSQL)

- ✅ **Express.js API Server**: RESTful endpoints with Socket.IO real-time communication
- ✅ **PostgreSQL + PostGIS Database**: Spatial database with disaster zones, shelters, alerts
- ✅ **Comprehensive SMS Notifications**: Twilio integration with multi-language support
- ✅ **Emergency Service Dispatch**: Automatic notifications to emergency responders
- ✅ **Spatial Query Functions**: PostGIS functions for nearby shelters and disaster zones
- ✅ **Rate Limiting & Security**: Protection against abuse with comprehensive error handling
- ✅ **Database Migration System**: Complete schema with sample data for testing

#### Core API Endpoints

- ✅ `POST /api/sos/alert` - Create emergency alerts with automatic dispatch
- ✅ `GET /api/sos/nearby` - Get nearby active alerts for heatmap
- ✅ `GET /api/sos/shelters` - Find emergency shelters by location
- ✅ `GET /api/sos/disaster-zones` - Check for active disaster zones
- ✅ `POST /api/notifications/emergency-alert/:id` - Emergency service notifications
- ✅ `POST /api/notifications/shelter-info` - Send shelter information via SMS
- ✅ `GET /api/notifications/status` - Notification system status

#### Multi-Language SMS System

The system sends emergency notifications in 4 South African languages:

- 🗣️ **English** - Primary language
- 🗣️ **IsiZulu** - "🚨 ISEXWAYISO" (Emergency Alert)
- 🗣️ **IsiXhosa** - "🚨 ILISO LEXESHA LINGXAMISEKO" (Emergency Alert)
- 🗣️ **Afrikaans** - "🚨 NOODGEVAL WAARSKUWING" (Emergency Alert)

#### Database Schema

- 📊 **SOS Alerts**: Spatial emergency alerts with status tracking
- 🏠 **Emergency Shelters**: Capacity management and location data
- ⚠️ **Disaster Zones**: Active disaster areas with evacuation requirements
- 🌦️ **Weather Alerts**: Automated weather-based emergency notifications
- 👥 **Users**: Authentication and language preferences
- 📝 **Notification Log**: Complete audit trail of all messages sent

### Technical Architecture

#### Spatial Database Functions

```sql
-- Find nearby emergency alerts
SELECT * FROM get_nearby_sos_alerts(lat, lng, radius_km);

-- Find available emergency shelters
SELECT * FROM get_nearby_shelters(lat, lng, radius_km);

-- Check if location is in disaster zone
SELECT * FROM is_in_disaster_zone(lat, lng);
```

#### Real-time Communication

- 🔴 **WebSocket Events**: Live emergency alert broadcasting
- 📡 **Location-based Rooms**: Users get alerts for their geographic area
- ⚡ **Instant Dispatch**: Emergency services notified within seconds

#### Offline Functionality

- 💾 **IndexedDB Storage**: Critical SOS alerts saved locally
- 🔄 **Background Sync**: Automatic retry when connection restored
- ⚠️ **Offline Indicators**: Users know when they're offline but protected

## 📊 API Documentation

Comprehensive API documentation is available in `/backend/README.md` with:

- Complete endpoint reference
- Request/response examples
- Error handling guides
- Rate limiting information
- Multi-language message templates

## 🔧 Deployment Guide

### Database Setup

```bash
# Install PostgreSQL with PostGIS
sudo apt-get install postgresql postgis

# Create database and run migrations
createdb crisislink
psql crisislink -f database/migrations/001_initial_schema.sql
```

### Backend Configuration

```env
# Database
DB_HOST=localhost
DB_NAME=crisislink
DB_USER=postgres

# Twilio SMS
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
EMERGENCY_DISPATCH_NUMBERS=+27111111111,+27222222222

# Weather API
WEATHER_API_KEY=your_openweather_key
```

### Production Deployment

```bash
# Start backend server
cd backend && npm start

# Start frontend
cd frontend && npm run build && npm start
```

## 👥 Contributors

This project was developed by a dedicated team of South African developers committed to improving emergency response systems:

### 🏆 Core Development Team

- **[@kgodisoLeonard](https://github.com/kgodisoLeonard)** - Leonard Kgodiso
  - Backend architecture, database design, emergency systems
- **[@Itow-K](https://github.com/Itow-K)** - K Itow
  - Frontend development, UI/UX design, mobile optimization
- **[@buhleBrian](https://github.com/buhleBrian)** - Brian Buhle
  - Full-stack development, API integration, offline functionality

_See [CONTRIBUTORS.md](./CONTRIBUTORS.md) for detailed contributor information and project roles._

## 🤝 Contributing

We welcome contributions from the community! This project addresses real emergency response needs in South Africa.

### Development Setup

1. Clone repository
2. Install dependencies: `npm install` in both frontend/ and backend/
3. Set up PostgreSQL with PostGIS extension
4. Configure environment variables
5. Run database migrations
6. Start development servers: `npm run dev`

## 📄 License

MIT License - See LICENSE file for details.

---

**Built with ❤️ for South African communities facing natural disasters**

**System Status: 🟢 FULLY OPERATIONAL - Ready for Emergency Response**
