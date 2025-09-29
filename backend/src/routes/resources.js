const express = require('express')
const router = express.Router()

// Get emergency resources
router.get('/', (req, res) => {
  const resources = {
    emergencyContacts: {
      police: '10111',
      fire: '10177',
      ambulance: '10177',
      disaster: '021-590-1900',
    },
    safetyTips: [
      {
        id: 1,
        category: 'flood',
        title: 'Flood Safety',
        tips: [
          'Move to higher ground immediately',
          'Avoid walking or driving through flood water',
          'Stay away from power lines',
          'Listen to emergency broadcasts',
        ],
      },
      {
        id: 2,
        category: 'fire',
        title: 'Wildfire Safety',
        tips: [
          'Create a defensible space around your home',
          'Have an evacuation plan ready',
          'Keep important documents in a go-bag',
          'Monitor local emergency alerts',
        ],
      },
    ],
    languages: {
      en: 'English',
      zu: 'Zulu',
      xh: 'Xhosa',
      af: 'Afrikaans',
    },
  }

  res.json(resources)
})

// Get safety tips by category
router.get('/safety-tips/:category', (req, res) => {
  const { category } = req.params

  const allTips = {
    flood: {
      title: 'Flood Safety Guidelines',
      tips: [
        'Move to higher ground immediately',
        'Avoid walking or driving through flood water',
        'Turn off utilities if instructed',
        'Stay informed through emergency broadcasts',
      ],
    },
    fire: {
      title: 'Fire Safety Guidelines',
      tips: [
        'Evacuate immediately if instructed',
        'Close all windows and doors',
        'Wet cloth over nose and mouth for smoke',
        'Stay low to avoid smoke inhalation',
      ],
    },
    storm: {
      title: 'Storm Safety Guidelines',
      tips: [
        'Stay indoors and away from windows',
        'Avoid using electrical appliances',
        'Keep emergency supplies ready',
        'Do not go outside during the eye of a hurricane',
      ],
    },
  }

  const tips = allTips[category]
  if (!tips) {
    return res.status(404).json({ error: 'Category not found' })
  }

  res.json(tips)
})

module.exports = router
