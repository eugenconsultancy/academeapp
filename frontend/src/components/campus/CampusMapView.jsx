// frontend/src/components/campus/CampusMapView.jsx
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Circle } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix default icon (global)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

// Custom icons
const userIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const venueIcons = {
    verified: new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: markerShadow,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    }),
    pending: new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
        shadowUrl: markerShadow,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    }),
    rejected: new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: markerShadow,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    }),
    default: new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
        shadowUrl: markerShadow,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    })
};

const GEOFENCE_RADIUS = 50;

function ChangeMapView({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (center && center[0] !== 0 && center[1] !== 0) {
            map.setView(center, zoom);
        }
    }, [center, zoom, map]);
    return null;
}

function MapLoadingOverlay({ isVisible }) {
    if (!isVisible) return null;
    return (
        <div className="absolute inset-0 z-[1000] bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-indigo-600 dark:text-indigo-400 font-medium">Getting your location...</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Please enable GPS for accurate venue distances</p>
        </div>
    );
}

export default function CampusMapView({
    center,
    zoom,
    location,
    venues,
    polylinePositions,
    onVenueSelect,
    openBackendDirections,
    onGetDirections,
    checkInStatusMap,
    showLoadingOverlay,
}) {
    // Determine icon for a venue based on check‑in status
    const getVenueIcon = (venue) => {
        const status = checkInStatusMap[venue.name?.toLowerCase()];
        switch (status) {
            case 'verified': return venueIcons.verified;
            case 'pending': return venueIcons.pending;
            case 'rejected': return venueIcons.rejected;
            default: return venueIcons.default;
        }
    };

    return (
        <div className="cm-map-wrapper">
            <MapContainer
                center={center}
                zoom={zoom}
                className="cm-map-container"
                scrollWheelZoom={true}
                aria-label="Interactive campus map"
            >
                <ChangeMapView center={center} zoom={zoom} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {location && (
                    <Marker position={[location.latitude, location.longitude]} icon={userIcon}>
                        <Popup>You are here</Popup>
                    </Marker>
                )}
                {polylinePositions.length === 2 && (
                    <Polyline positions={polylinePositions} color="#6366f1" weight={3} opacity={0.8} dashArray="5, 10" />
                )}

                {/* Geofence circles around each venue */}
                {venues.map(venue =>
                    venue.latitude && venue.longitude ? (
                        <Circle
                            key={`geofence-${venue.id}`}
                            center={[venue.latitude, venue.longitude]}
                            radius={GEOFENCE_RADIUS}
                            pathOptions={{
                                color: '#6366f1',
                                fillColor: '#6366f1',
                                fillOpacity: 0.08,
                                weight: 1,
                                dashArray: '4 4'
                            }}
                        />
                    ) : null
                )}

                <MarkerClusterGroup
                    chunkedLoading
                    maxClusterRadius={50}
                    disableClusteringAtZoom={18}
                    spiderfyOnMaxZoom={true}
                    showCoverageOnHover={false}
                >
                    {venues.map(venue =>
                        venue.latitude && venue.longitude ? (
                            <Marker
                                key={venue.id}
                                position={[venue.latitude, venue.longitude]}
                                icon={getVenueIcon(venue)}
                                eventHandlers={{ click: () => onVenueSelect(venue) }}
                            >
                                <Popup>
                                    <div style={{ minWidth: '160px' }}>
                                        <strong>{venue.name}</strong>
                                        <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '4px 0' }}>
                                            {venue.venue_type?.replace(/_/g, ' ')} – {venue.building_code || ''}
                                        </p>
                                        {venue.distance_display && (
                                            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#059669' }}>
                                                {venue.distance_display} • {venue.walking_time_minutes} min walk
                                            </p>
                                        )}
                                        {checkInStatusMap[venue.name?.toLowerCase()] === 'pending' && (
                                            <span className="pending-badge">
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" /></svg>
                                                Manual Review Pending
                                            </span>
                                        )}
                                        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                                            <button
                                                className="cm-card-btn cm-card-btn-maps"
                                                style={{ flex: 1 }}
                                                onClick={() => openBackendDirections(venue)}
                                            >
                                                Directions
                                            </button>
                                            <button
                                                className="cm-card-btn cm-card-btn-dir"
                                                style={{ flex: 1 }}
                                                onClick={() => onGetDirections(venue)}
                                            >
                                                Details
                                            </button>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ) : null
                    )}
                </MarkerClusterGroup>
            </MapContainer>
            <MapLoadingOverlay isVisible={showLoadingOverlay && !location} />
            {polylinePositions.length === 2 && (
                <div className="absolute bottom-3 left-3 z-[1000] bg-black/70 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" /></svg>
                    Straight-line distance only (not walking path)
                </div>
            )}
        </div>
    );
}