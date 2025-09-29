const express = require('express')
const router = express.Router()

// Mock data for shelters and evacuation routes
const shelters = [
  {
    id: 1,
    name: 'Johannesburg Community Center',
    location: { lat: -26.2041, lng: 28.0473 },
    capacity: 500,
    available: 350,
    facilities: ['Medical', 'Food', 'Bedding'],
    contact: '+27-11-123-4567',
  },
  {
    id: 2,
    name: 'Cape Town Emergency Shelter',
    location: { lat: -33.9249, lng: 18.4241 },
    capacity: 300,
    available: 280,
    facilities: ['Medical', 'Food'],
    contact: '+27-21-123-4567',
  },
]

// Get nearby shelters
router.get('/shelters', (req, res) => {
  const { lat, lng, radius = 50 } = req.query

  if (!lat || !lng) {
    return res.json({ shelters })
  }

  // Filter by distance (simplified)
  const nearbyShelters = shelters.filter((shelter) => {
    const distance =
      Math.abs(shelter.location.lat - parseFloat(lat)) +
      Math.abs(shelter.location.lng - parseFloat(lng))
    return distance < radius / 100 // Rough approximation
  })

  res.json({ shelters: nearbyShelters })
})

// Get evacuation routes
router.get('/evacuation-routes', (req, res) => {
  const routes = [
    {
      id: 1,
      name: 'Northern Route to Safety',
      waypoints: [
        { lat: -26.2041, lng: 28.0473 },
        { lat: -26.1041, lng: 28.0573 },
        { lat: -26.0041, lng: 28.0673 },
      ],
      status: 'open',
      estimatedTime: '45 minutes',
    },
  ]

  res.json({ routes })
})

module.exports = router
