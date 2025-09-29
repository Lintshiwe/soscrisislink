import React, { useEffect, useRef, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import styled from 'styled-components'
import 'leaflet/dist/leaflet.css'
import {
  MapComponentProps,
  Location,
  SOSAlert,
  Shelter,
  EvacuationRoute,
  DisasterZone,
} from '../../types'

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
})

// Custom icons
const createCustomIcon = (color: string, symbol: string) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="
        background-color: ${color};
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        font-weight: bold;
        color: white;
        font-size: 16px;
      ">${symbol}</div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

const sosIcon = createCustomIcon('#ff0000', '🆘')
const shelterIcon = createCustomIcon('#00aa00', '🏠')
const hospitalIcon = createCustomIcon('#0066cc', '🏥')
const fireIcon = createCustomIcon('#ff6600', '🔥')
const floodIcon = createCustomIcon('#0099ff', '🌊')
const userIcon = createCustomIcon('#6600cc', '📍')

// Styled components
const MapWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;

  .leaflet-container {
    height: 100%;
    width: 100%;
    z-index: 1;
  }

  .custom-div-icon {
    background: transparent !important;
    border: none !important;
  }
`

const MapControls = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const ControlButton = styled.button<{ active?: boolean }>`
  background: ${(props) =>
    props.active ? '#ff0000' : 'rgba(255, 255, 255, 0.9)'};
  color: ${(props) => (props.active ? 'white' : '#333')};
  border: none;
  border-radius: 8px;
  padding: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
  min-width: 120px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
`

const MapLegend = styled.div`
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(255, 255, 255, 0.95);
  padding: 15px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  max-width: 250px;
`

const LegendTitle = styled.h3`
  margin: 0 0 10px 0;
  color: #333;
  font-size: 16px;
`

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  margin: 8px 0;
  font-size: 14px;
  color: #555;
`

const LegendColor = styled.div<{ color: string }>`
  width: 20px;
  height: 20px;
  background: ${(props) => props.color};
  border-radius: 50%;
  margin-right: 10px;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
`

// Map update component
const MapUpdater: React.FC<{ center: Location; zoom?: number }> = ({
  center,
  zoom = 13,
}) => {
  const map = useMap()

  useEffect(() => {
    map.setView([center.lat, center.lng], zoom)
  }, [map, center, zoom])

  return null
}

// Alert cluster component for performance
const AlertCluster: React.FC<{ alerts: SOSAlert[] }> = ({ alerts }) => {
  if (alerts.length === 0) return null

  return (
    <>
      {alerts.map((alert) => (
        <Marker
          key={alert.id}
          position={[alert.location.lat, alert.location.lng]}
          icon={sosIcon}
        >
          <Popup>
            <div>
              <h4>🚨 Emergency Alert</h4>
              <p>
                <strong>Status:</strong> {alert.status}
              </p>
              <p>
                <strong>Urgency:</strong> {alert.urgency}
              </p>
              <p>
                <strong>Time:</strong>{' '}
                {new Date(alert.timestamp || '').toLocaleString()}
              </p>
              {alert.description && (
                <p>
                  <strong>Details:</strong> {alert.description}
                </p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  )
}

// Disaster zones component
const DisasterZones: React.FC<{ zones: DisasterZone[] }> = ({ zones }) => {
  const getZoneColor = (type: string, severity: string) => {
    const colors = {
      flood: {
        low: '#b3d9ff',
        medium: '#66b3ff',
        high: '#0080ff',
        extreme: '#0066cc',
      },
      fire: {
        low: '#ffccb3',
        medium: '#ff9966',
        high: '#ff6600',
        extreme: '#cc3300',
      },
      storm: {
        low: '#e6ccff',
        medium: '#cc99ff',
        high: '#9966ff',
        extreme: '#6633cc',
      },
      earthquake: {
        low: '#d9b3ff',
        medium: '#b366ff',
        high: '#8000ff',
        extreme: '#5500aa',
      },
    }
    return (
      colors[type as keyof typeof colors]?.[
        severity as keyof typeof colors.flood
      ] || '#cccccc'
    )
  }

  const getZoneIcon = (type: string) => {
    const icons = { flood: '🌊', fire: '🔥', storm: '⛈️', earthquake: '🏔️' }
    return icons[type as keyof typeof icons] || '⚠️'
  }

  return (
    <>
      {zones.map((zone) => (
        <React.Fragment key={zone.id}>
          <Circle
            center={[zone.location.lat, zone.location.lng]}
            radius={zone.radius * 1000} // Convert km to meters
            pathOptions={{
              color: getZoneColor(zone.type, zone.severity),
              fillColor: getZoneColor(zone.type, zone.severity),
              fillOpacity: 0.3,
              weight: 2,
            }}
          />
          <Marker
            position={[zone.location.lat, zone.location.lng]}
            icon={createCustomIcon(
              getZoneColor(zone.type, zone.severity),
              getZoneIcon(zone.type)
            )}
          >
            <Popup>
              <div>
                <h4>
                  {getZoneIcon(zone.type)} {zone.type.toUpperCase()} Zone
                </h4>
                <p>
                  <strong>Severity:</strong> {zone.severity}
                </p>
                <p>
                  <strong>Radius:</strong> {zone.radius} km
                </p>
                <p>
                  <strong>Last Updated:</strong>{' '}
                  {new Date(zone.lastUpdated).toLocaleString()}
                </p>
              </div>
            </Popup>
          </Marker>
        </React.Fragment>
      ))}
    </>
  )
}

const DisasterMap: React.FC<MapComponentProps> = ({
  center,
  alerts = [],
  shelters = [],
  evacuationRoutes = [],
  disasterZones = [],
  onLocationSelect,
}) => {
  const [showAlerts, setShowAlerts] = useState(true)
  const [showShelters, setShowShelters] = useState(true)
  const [showRoutes, setShowRoutes] = useState(true)
  const [showZones, setShowZones] = useState(true)
  const mapRef = useRef<L.Map>(null)

  // Mock disaster zones for demo
  const mockDisasterZones: DisasterZone[] = [
    {
      id: 1,
      type: 'flood',
      location: { lat: -26.2041, lng: 28.0473 },
      radius: 5,
      severity: 'high',
      lastUpdated: new Date().toISOString(),
    },
    {
      id: 2,
      type: 'fire',
      location: { lat: -26.1041, lng: 28.0673 },
      radius: 8,
      severity: 'extreme',
      lastUpdated: new Date().toISOString(),
    },
  ]

  const currentZones =
    disasterZones.length > 0 ? disasterZones : mockDisasterZones

  const handleMapClick = (e: L.LeafletMouseEvent) => {
    if (onLocationSelect) {
      onLocationSelect({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      })
    }
  }

  useEffect(() => {
    // Add click handler when map is ready
    const map = mapRef.current
    if (map) {
      map.on('click', handleMapClick)
      return () => {
        map.off('click', handleMapClick)
      }
    }
  }, [onLocationSelect])

  return (
    <MapWrapper>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={13}
        ref={mapRef}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapUpdater center={center} />

        {/* User location */}
        <Marker position={[center.lat, center.lng]} icon={userIcon}>
          <Popup>
            <div>
              <h4>📍 Your Location</h4>
              <p>Lat: {center.lat.toFixed(4)}</p>
              <p>Lng: {center.lng.toFixed(4)}</p>
            </div>
          </Popup>
        </Marker>

        {/* SOS Alerts */}
        {showAlerts && <AlertCluster alerts={alerts} />}

        {/* Shelters */}
        {showShelters &&
          shelters.map((shelter) => (
            <Marker
              key={shelter.id}
              position={[shelter.location.lat, shelter.location.lng]}
              icon={shelterIcon}
            >
              <Popup>
                <div>
                  <h4>🏠 {shelter.name}</h4>
                  <p>
                    <strong>Capacity:</strong> {shelter.capacity} people
                  </p>
                  <p>
                    <strong>Available:</strong> {shelter.available} spaces
                  </p>
                  <p>
                    <strong>Facilities:</strong> {shelter.facilities.join(', ')}
                  </p>
                  <p>
                    <strong>Contact:</strong> {shelter.contact}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Evacuation Routes */}
        {showRoutes &&
          evacuationRoutes.map((route) => (
            <Polyline
              key={route.id}
              positions={route.waypoints.map((wp) => [wp.lat, wp.lng])}
              pathOptions={{
                color: route.status === 'open' ? '#00aa00' : '#ff0000',
                weight: 4,
                opacity: 0.8,
              }}
            >
              <Popup>
                <div>
                  <h4>🛣️ {route.name}</h4>
                  <p>
                    <strong>Status:</strong> {route.status}
                  </p>
                  <p>
                    <strong>Est. Time:</strong> {route.estimatedTime}
                  </p>
                </div>
              </Popup>
            </Polyline>
          ))}

        {/* Disaster Zones */}
        {showZones && <DisasterZones zones={currentZones} />}
      </MapContainer>

      {/* Map Controls */}
      <MapControls>
        <ControlButton
          active={showAlerts}
          onClick={() => setShowAlerts(!showAlerts)}
        >
          🚨 SOS Alerts
        </ControlButton>
        <ControlButton
          active={showShelters}
          onClick={() => setShowShelters(!showShelters)}
        >
          🏠 Shelters
        </ControlButton>
        <ControlButton
          active={showRoutes}
          onClick={() => setShowRoutes(!showRoutes)}
        >
          🛣️ Routes
        </ControlButton>
        <ControlButton
          active={showZones}
          onClick={() => setShowZones(!showZones)}
        >
          ⚠️ Danger Zones
        </ControlButton>
      </MapControls>

      {/* Legend */}
      <MapLegend>
        <LegendTitle>🗺️ Map Legend</LegendTitle>
        {showAlerts && (
          <LegendItem>
            <LegendColor color="#ff0000" />
            🆘 Emergency Alerts
          </LegendItem>
        )}
        {showShelters && (
          <LegendItem>
            <LegendColor color="#00aa00" />
            🏠 Emergency Shelters
          </LegendItem>
        )}
        {showRoutes && (
          <LegendItem>
            <LegendColor color="#00aa00" />
            🛣️ Evacuation Routes
          </LegendItem>
        )}
        {showZones && (
          <>
            <LegendItem>
              <LegendColor color="#0080ff" />
              🌊 Flood Zones
            </LegendItem>
            <LegendItem>
              <LegendColor color="#ff6600" />
              🔥 Fire Zones
            </LegendItem>
            <LegendItem>
              <LegendColor color="#9966ff" />
              ⛈️ Storm Zones
            </LegendItem>
          </>
        )}
        <LegendItem>
          <LegendColor color="#6600cc" />
          📍 Your Location
        </LegendItem>
      </MapLegend>
    </MapWrapper>
  )
}

export default DisasterMap
