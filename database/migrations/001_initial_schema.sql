-- CrisisLink Database Schema
-- PostgreSQL with PostGIS extension for spatial data

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Users table for authentication and user management
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    name VARCHAR(100),
    password_hash VARCHAR(255),
    language VARCHAR(5) DEFAULT 'en',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_location GEOMETRY(POINT, 4326),
    notification_preferences JSONB DEFAULT '{
        "weather_alerts": true,
        "emergency_broadcasts": true,
        "evacuation_notices": true
    }'::jsonb
);

-- SOS Alerts table with spatial data
CREATE TABLE sos_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    location GEOMETRY(POINT, 4326) NOT NULL,
    location_accuracy FLOAT,
    description TEXT,
    urgency VARCHAR(20) CHECK (urgency IN ('low', 'medium', 'high', 'critical')) DEFAULT 'high',
    status VARCHAR(20) CHECK (status IN ('active', 'acknowledged', 'responding', 'resolved', 'false_alarm')) DEFAULT 'active',
    contact_info JSONB,
    additional_data JSONB,
    weather_conditions JSONB,
    responder_id INTEGER REFERENCES users(id),
    estimated_response_time INTERVAL,
    response_time INTERVAL,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Emergency Shelters with spatial data
CREATE TABLE emergency_shelters (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location GEOMETRY(POINT, 4326) NOT NULL,
    address TEXT,
    capacity INTEGER NOT NULL,
    current_occupancy INTEGER DEFAULT 0,
    facilities TEXT[],
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    manager_name VARCHAR(100),
    status VARCHAR(20) CHECK (status IN ('operational', 'full', 'closed', 'maintenance')) DEFAULT 'operational',
    accessibility_features TEXT[],
    pet_friendly BOOLEAN DEFAULT false,
    medical_facilities BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Evacuation Routes with line geometry
CREATE TABLE evacuation_routes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    route_path GEOMETRY(LINESTRING, 4326) NOT NULL,
    waypoints JSONB,
    status VARCHAR(20) CHECK (status IN ('open', 'closed', 'congested', 'damaged')) DEFAULT 'open',
    estimated_time INTERVAL,
    capacity INTEGER,
    current_usage INTEGER DEFAULT 0,
    road_conditions TEXT,
    alternative_routes INTEGER[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Disaster Zones with polygon geometry
CREATE TABLE disaster_zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    zone_area GEOMETRY(POLYGON, 4326) NOT NULL,
    center_point GEOMETRY(POINT, 4326) NOT NULL,
    disaster_type VARCHAR(50) CHECK (disaster_type IN ('flood', 'fire', 'storm', 'earthquake', 'landslide', 'drought')) NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'extreme')) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('active', 'monitoring', 'resolved', 'archived')) DEFAULT 'active',
    estimated_affected_population INTEGER,
    evacuation_recommended BOOLEAN DEFAULT false,
    evacuation_mandatory BOOLEAN DEFAULT false,
    weather_related BOOLEAN DEFAULT true,
    source VARCHAR(100),
    confidence_level FLOAT CHECK (confidence_level BETWEEN 0 AND 1),
    predicted_duration INTERVAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- Weather Alerts table
CREATE TABLE weather_alerts (
    id SERIAL PRIMARY KEY,
    location GEOMETRY(POINT, 4326) NOT NULL,
    alert_area GEOMETRY(POLYGON, 4326),
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('minor', 'moderate', 'severe', 'extreme')) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    weather_data JSONB,
    source VARCHAR(50) DEFAULT 'openweathermap',
    alert_id VARCHAR(100) UNIQUE,
    affected_population INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Emergency Contacts table
CREATE TABLE emergency_contacts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    organization VARCHAR(255),
    service_type VARCHAR(100),
    coverage_area GEOMETRY(POLYGON, 4326),
    languages VARCHAR(50)[],
    availability_hours VARCHAR(100) DEFAULT '24/7',
    priority INTEGER DEFAULT 1,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Safety Tips table with multi-language support
CREATE TABLE safety_tips (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    title JSONB NOT NULL, -- Multilingual titles
    content JSONB NOT NULL, -- Multilingual content
    disaster_types VARCHAR(50)[],
    severity_levels VARCHAR(20)[],
    priority INTEGER DEFAULT 1,
    media_urls TEXT[],
    last_reviewed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notification Log table
CREATE TABLE notification_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    message TEXT,
    channels VARCHAR(20)[],
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivery_status VARCHAR(20) DEFAULT 'sent',
    read_at TIMESTAMP,
    metadata JSONB
);

-- Emergency Response Teams table
CREATE TABLE response_teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    team_type VARCHAR(50),
    base_location GEOMETRY(POINT, 4326),
    coverage_area GEOMETRY(POLYGON, 4326),
    specializations VARCHAR(50)[],
    contact_info JSONB,
    current_status VARCHAR(20) CHECK (current_status IN ('available', 'deployed', 'off_duty', 'maintenance')) DEFAULT 'available',
    current_location GEOMETRY(POINT, 4326),
    team_size INTEGER,
    equipment_list TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Spatial Indexes for better performance
CREATE INDEX idx_sos_alerts_location ON sos_alerts USING GIST (location);
CREATE INDEX idx_sos_alerts_created_at ON sos_alerts (created_at);
CREATE INDEX idx_shelters_location ON emergency_shelters USING GIST (location);
CREATE INDEX idx_routes_path ON evacuation_routes USING GIST (route_path);
CREATE INDEX idx_disaster_zones_area ON disaster_zones USING GIST (zone_area);
CREATE INDEX idx_disaster_zones_center ON disaster_zones USING GIST (center_point);
CREATE INDEX idx_weather_alerts_location ON weather_alerts USING GIST (location);
CREATE INDEX idx_weather_alerts_area ON weather_alerts USING GIST (alert_area);
CREATE INDEX idx_response_teams_location ON response_teams USING GIST (base_location);
CREATE INDEX idx_response_teams_coverage ON response_teams USING GIST (coverage_area);

-- Regular Indexes
CREATE INDEX idx_sos_alerts_status ON sos_alerts (status);
CREATE INDEX idx_sos_alerts_urgency ON sos_alerts (urgency);
CREATE INDEX idx_shelters_status ON emergency_shelters (status);
CREATE INDEX idx_routes_status ON evacuation_routes (status);
CREATE INDEX idx_disaster_zones_type ON disaster_zones (disaster_type);
CREATE INDEX idx_disaster_zones_severity ON disaster_zones (severity);
CREATE INDEX idx_weather_alerts_severity ON weather_alerts (severity);
CREATE INDEX idx_users_email ON users (email);

-- Functions for common spatial queries

-- Function to find nearby SOS alerts
CREATE OR REPLACE FUNCTION get_nearby_sos_alerts(
    center_lat FLOAT,
    center_lng FLOAT,
    radius_km FLOAT DEFAULT 50
)
RETURNS TABLE(
    id INTEGER,
    location_lat FLOAT,
    location_lng FLOAT,
    urgency VARCHAR,
    status VARCHAR,
    description TEXT,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        sa.id,
        ST_Y(sa.location) as location_lat,
        ST_X(sa.location) as location_lng,
        sa.urgency,
        sa.status,
        sa.description,
        sa.created_at
    FROM sos_alerts sa
    WHERE ST_DWithin(
        sa.location::geography,
        ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
        radius_km * 1000
    )
    AND sa.status IN ('active', 'acknowledged', 'responding')
    ORDER BY ST_Distance(
        sa.location::geography,
        ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography
    );
END;
$$ LANGUAGE plpgsql;

-- Function to find nearby shelters
CREATE OR REPLACE FUNCTION get_nearby_shelters(
    center_lat FLOAT,
    center_lng FLOAT,
    radius_km FLOAT DEFAULT 50
)
RETURNS TABLE(
    id INTEGER,
    name VARCHAR,
    location_lat FLOAT,
    location_lng FLOAT,
    capacity INTEGER,
    available_space INTEGER,
    facilities TEXT[],
    contact_phone VARCHAR,
    distance_km FLOAT
) AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        es.id,
        es.name,
        ST_Y(es.location) as location_lat,
        ST_X(es.location) as location_lng,
        es.capacity,
        (es.capacity - es.current_occupancy) as available_space,
        es.facilities,
        es.contact_phone,
        (ST_Distance(
            es.location::geography,
            ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography
        ) / 1000) as distance_km
    FROM emergency_shelters es
    WHERE ST_DWithin(
        es.location::geography,
        ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
        radius_km * 1000
    )
    AND es.status = 'operational'
    AND es.current_occupancy < es.capacity
    ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;

-- Function to check if point is in disaster zone
CREATE OR REPLACE FUNCTION is_in_disaster_zone(
    check_lat FLOAT,
    check_lng FLOAT
)
RETURNS TABLE(
    zone_id INTEGER,
    disaster_type VARCHAR,
    severity VARCHAR,
    evacuation_recommended BOOLEAN,
    evacuation_mandatory BOOLEAN
) AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        dz.id as zone_id,
        dz.disaster_type,
        dz.severity,
        dz.evacuation_recommended,
        dz.evacuation_mandatory
    FROM disaster_zones dz
    WHERE ST_Within(
        ST_SetSRID(ST_MakePoint(check_lng, check_lat), 4326),
        dz.zone_area
    )
    AND dz.status = 'active'
    ORDER BY dz.severity DESC;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sos_alerts_updated_at BEFORE UPDATE ON sos_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shelters_updated_at BEFORE UPDATE ON emergency_shelters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON evacuation_routes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_disaster_zones_updated_at BEFORE UPDATE ON disaster_zones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data for development and testing
INSERT INTO emergency_contacts (name, phone, organization, service_type, languages) VALUES
('South African Police Service', '10111', 'SAPS', 'Police', ARRAY['en', 'af', 'zu', 'xh']),
('Emergency Medical Services', '10177', 'EMS', 'Medical', ARRAY['en', 'af', 'zu', 'xh']),
('Fire & Rescue Services', '10177', 'Fire Department', 'Fire', ARRAY['en', 'af', 'zu', 'xh']),
('Disaster Management Centre', '021-590-1900', 'City of Cape Town', 'Disaster Management', ARRAY['en', 'af', 'xh']),
('Provincial Disaster Management', '011-355-8000', 'Gauteng Provincial Government', 'Disaster Management', ARRAY['en', 'af', 'zu']);

-- Sample shelters in major South African cities
INSERT INTO emergency_shelters (name, location, address, capacity, facilities, contact_phone) VALUES
('Johannesburg Community Center', ST_SetSRID(ST_MakePoint(28.0473, -26.2041), 4326), 
 'City Center, Johannesburg', 500, ARRAY['Medical', 'Food', 'Bedding', 'Showers'], '+27-11-123-4567'),
('Cape Town Emergency Shelter', ST_SetSRID(ST_MakePoint(18.4241, -33.9249), 4326), 
 'District Six, Cape Town', 300, ARRAY['Medical', 'Food', 'Bedding'], '+27-21-123-4567'),
('Durban Relief Center', ST_SetSRID(ST_MakePoint(31.0218, -29.8587), 4326), 
 'Central Durban', 400, ARRAY['Medical', 'Food', 'Bedding', 'Child Care'], '+27-31-123-4567');

-- Sample safety tips with multilingual support
INSERT INTO safety_tips (category, title, content, disaster_types) VALUES
('flood', 
 '{"en": "Flood Safety", "zu": "Ukuphephela Esikhaleni", "xh": "Ukhuseleko Lwezikhukula", "af": "Vloedveiligheid"}'::jsonb,
 '{"en": ["Move to higher ground immediately", "Avoid walking through flood water", "Stay away from power lines"], 
   "zu": ["Iya endaweni ephakeme ngokushesha", "Gwema ukuhamba emanzini esikaleni", "Hlala kude nezintambo zikagesi"], 
   "xh": ["Yiya kwindawo ephakamileyo ngokukhawuleza", "Phepha ukuhamba emanzini ezikhukula", "Hlala kude kwiintambo zombane"], 
   "af": ["Beweeg onmiddellik na hoër grond", "Vermy om deur vloedwater te loop", "Bly weg van kraglyne"]}'::jsonb,
 ARRAY['flood']),
('fire',
 '{"en": "Fire Safety", "zu": "Ukuphephela Emlilweni", "xh": "Ukhuseleko Lomlilo", "af": "Brandveiligheid"}'::jsonb,
 '{"en": ["Evacuate immediately if instructed", "Stay low to avoid smoke", "Have evacuation plan ready"], 
   "zu": ["Suka ngokushesha uma utjelwe", "Hlala pansi ukugwema intuthu", "Yiba nohlelo lokusuka"], 
   "xh": ["Suka ngokukhawuleza ukuba uyalelwa", "Hlala phantsi ukuphepha umsi", "Yiba nesicwangciso sokuphuma"], 
   "af": ["Ontruim onmiddellik indien beveel", "Bly laag om rook te vermy", "Hê ontruimingsplan gereed"]}'::jsonb,
 ARRAY['fire']);

COMMIT;