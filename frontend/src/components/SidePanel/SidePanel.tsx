import React, { useState, useEffect, useCallback } from 'react'
import styled, { keyframes } from 'styled-components'
import {
  SidePanelProps,
  Shelter,
  EvacuationRoute,
  SafetyTip,
  EmergencyContact,
} from '../../types'
import apiService from '../../services/api'

// Animations
const slideIn = keyframes`
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
`

const slideOut = keyframes`
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(100%);
  }
`

// Styled components
const Overlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  opacity: ${(props) => (props.isOpen ? 1 : 0)};
  visibility: ${(props) => (props.isOpen ? 'visible' : 'hidden')};
  transition: all 0.3s ease;
`

const PanelContainer = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: 90vw;
  max-width: 400px;
  background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
  color: white;
  z-index: 2001;
  overflow-y: auto;
  box-shadow: -5px 0 20px rgba(0, 0, 0, 0.5);

  animation: ${(props) => (props.isOpen ? slideIn : slideOut)} 0.3s ease-out;
  transform: ${(props) =>
    props.isOpen ? 'translateX(0)' : 'translateX(100%)'};
`

const PanelHeader = styled.div`
  padding: 20px;
  background: linear-gradient(135deg, #ff0000, #cc0000);
  position: sticky;
  top: 0;
  z-index: 10;
`

const HeaderTitle = styled.h2`
  margin: 0 0 10px 0;
  font-size: 24px;
  font-weight: bold;
`

const CloseButton = styled.button`
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 5px;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`

const LanguageSelector = styled.select`
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  cursor: pointer;

  option {
    background: #333;
    color: white;
  }
`

const PanelContent = styled.div`
  padding: 0;
`

const Section = styled.div`
  border-bottom: 1px solid #444;
`

const SectionHeader = styled.button<{ isExpanded: boolean }>`
  width: 100%;
  padding: 20px;
  background: none;
  border: none;
  color: white;
  text-align: left;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  &::after {
    content: '${(props) => (props.isExpanded ? '−' : '+')}';
    font-size: 24px;
    font-weight: bold;
  }
`

const SectionContent = styled.div<{ isExpanded: boolean }>`
  max-height: ${(props) => (props.isExpanded ? '1000px' : '0')};
  overflow: hidden;
  transition: max-height 0.3s ease;
  background: rgba(0, 0, 0, 0.2);
`

const SectionBody = styled.div`
  padding: 20px;
`

const ItemList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`

const Item = styled.div`
  background: rgba(255, 255, 255, 0.1);
  padding: 15px;
  border-radius: 10px;
  border-left: 4px solid #ff0000;
`

const ItemTitle = styled.h4`
  margin: 0 0 8px 0;
  color: #ffffff;
  font-size: 16px;
`

const ItemContent = styled.p`
  margin: 0;
  color: #cccccc;
  font-size: 14px;
  line-height: 1.4;
`

const ItemDetail = styled.div`
  display: flex;
  justify-content: space-between;
  margin: 5px 0;
  font-size: 14px;
`

const EmergencyButton = styled.button`
  width: 100%;
  padding: 15px;
  background: linear-gradient(135deg, #ff0000, #cc0000);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  margin: 10px 0;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 0, 0, 0.3);
  }
`

const StatusText = styled.span<{ status: string }>`
  color: ${(props) => (props.status === 'open' ? '#00ff00' : '#ff0000')};
`

// Language translations
const translations = {
  en: {
    title: '🆘 Emergency Resources',
    evacuationRoutes: 'Evacuation Routes',
    emergencyShelters: 'Emergency Shelters',
    safetyTips: 'Safety Tips',
    emergencyContacts: 'Emergency Contacts',
    callNow: 'Call Now',
    capacity: 'Capacity',
    available: 'Available',
    facilities: 'Facilities',
    contact: 'Contact',
    status: 'Status',
    estimatedTime: 'Estimated Time',
    noDataAvailable: 'No data available',
    loading: 'Loading...',
  },
  zu: {
    title: '🆘 Izinsiza Zesimo Esiphuthumayo',
    evacuationRoutes: 'Izindlela Zokubaleka',
    emergencyShelters: 'Izindawo Zokuphephela',
    safetyTips: 'Amasu Okuphepha',
    emergencyContacts: 'Oxhumana Nabo Esimweni Esiphuthumayo',
    callNow: 'Shayela Manje',
    capacity: 'Umthamo',
    available: 'Okukhona',
    facilities: 'Izinsiza',
    contact: 'Xhumana',
    status: 'Isimo',
    estimatedTime: 'Isikhathi Esilindelekile',
    noDataAvailable: 'Ayikho imininingwane',
    loading: 'Iyalayisha...',
  },
  xh: {
    title: '🆘 Izixhobo Zongxamiseko',
    evacuationRoutes: 'Iindlela Zokubaleka',
    emergencyShelters: 'Iindawo Zokukhusela',
    safetyTips: 'Iingcebiso Zokhuseleko',
    emergencyContacts: 'Oqhagamshelwano Ongxamiseko',
    callNow: 'Biza Ngoku',
    capacity: 'Ubungakanani',
    available: 'Buyafumaneka',
    facilities: 'Izixhobo',
    contact: 'Qhagamshelana',
    status: 'Imeko',
    estimatedTime: 'Ixesha Elilindelekileyo',
    noDataAvailable: 'Akukho datha ikhoyo',
    loading: 'Iyalayisha...',
  },
  af: {
    title: '🆘 Noodhulpbronne',
    evacuationRoutes: 'Ontruimingsroetes',
    emergencyShelters: 'Noodskuilings',
    safetyTips: 'Veiligheidswenke',
    emergencyContacts: 'Noodkontakte',
    callNow: 'Bel Nou',
    capacity: 'Kapasiteit',
    available: 'Beskikbaar',
    facilities: 'Fasiliteite',
    contact: 'Kontak',
    status: 'Status',
    estimatedTime: 'Beraamde Tyd',
    noDataAvailable: 'Geen data beskikbaar nie',
    loading: 'Laai...',
  },
}

type Language = keyof typeof translations

const SidePanel: React.FC<SidePanelProps> = ({
  isOpen,
  onClose,
  userLocation,
}) => {
  const [language, setLanguage] = useState<Language>('en')
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({})
  const [shelters, setShelters] = useState<Shelter[]>([])
  const [evacuationRoutes, setEvacuationRoutes] = useState<EvacuationRoute[]>(
    []
  )
  const [safetyTips, setSafetyTips] = useState<SafetyTip[]>([])
  const [emergencyContacts, setEmergencyContacts] = useState<
    EmergencyContact[]
  >([])
  const [loading, setLoading] = useState(false)

  const t = translations[language]

  const loadPanelData = useCallback(async () => {
    if (!userLocation) return

    setLoading(true)
    try {
      // Load shelters
      const sheltersResponse = await apiService.getNearbyShelters(userLocation)
      if (sheltersResponse.success) {
        setShelters(sheltersResponse.data || [])
      }

      // Load evacuation routes
      const routesResponse = await apiService.getEvacuationRoutes(userLocation)
      if (routesResponse.success) {
        setEvacuationRoutes(routesResponse.data || [])
      }

      // Load safety tips
      const tipsResponse = await apiService.getSafetyTips()
      if (tipsResponse.success) {
        setSafetyTips(tipsResponse.data || [])
      }

      // Load emergency resources
      const resourcesResponse = await apiService.getEmergencyResources()
      if (resourcesResponse.success) {
        const contacts = Object.entries(
          resourcesResponse.data?.emergencyContacts || {}
        ).map(([name, number]) => ({ name, number: number as string }))
        setEmergencyContacts(contacts)
      }
    } catch (error) {
      console.error('Failed to load panel data:', error)
    } finally {
      setLoading(false)
    }
  }, [userLocation])

  // Load data when panel opens
  useEffect(() => {
    if (isOpen && userLocation) {
      loadPanelData()
    }
  }, [isOpen, userLocation, loadPanelData])

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }))
  }

  const handleCall = (number: string) => {
    window.location.href = `tel:${number}`
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <>
      <Overlay isOpen={isOpen} onClick={handleOverlayClick} />
      <PanelContainer isOpen={isOpen}>
        <PanelHeader>
          <HeaderTitle>{t.title}</HeaderTitle>
          <LanguageSelector
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            title="Select Language"
            aria-label="Select Language"
          >
            <option value="en">🇺🇸 English</option>
            <option value="zu">🇿🇦 IsiZulu</option>
            <option value="xh">🇿🇦 IsiXhosa</option>
            <option value="af">🇿🇦 Afrikaans</option>
          </LanguageSelector>
          <CloseButton onClick={onClose}>×</CloseButton>
        </PanelHeader>

        <PanelContent>
          {/* Emergency Contacts */}
          <Section>
            <SectionHeader
              isExpanded={expandedSections.contacts}
              onClick={() => toggleSection('contacts')}
            >
              📞 {t.emergencyContacts}
            </SectionHeader>
            <SectionContent isExpanded={expandedSections.contacts}>
              <SectionBody>
                {emergencyContacts.length > 0 ? (
                  <ItemList>
                    {emergencyContacts.map((contact, index) => (
                      <Item key={index}>
                        <ItemTitle>{contact.name}</ItemTitle>
                        <ItemContent>{contact.number}</ItemContent>
                        <EmergencyButton
                          onClick={() => handleCall(contact.number)}
                        >
                          📞 {t.callNow}
                        </EmergencyButton>
                      </Item>
                    ))}
                  </ItemList>
                ) : (
                  <ItemContent>
                    {loading ? t.loading : t.noDataAvailable}
                  </ItemContent>
                )}
              </SectionBody>
            </SectionContent>
          </Section>

          {/* Emergency Shelters */}
          <Section>
            <SectionHeader
              isExpanded={expandedSections.shelters}
              onClick={() => toggleSection('shelters')}
            >
              🏠 {t.emergencyShelters}
            </SectionHeader>
            <SectionContent isExpanded={expandedSections.shelters}>
              <SectionBody>
                {shelters.length > 0 ? (
                  <ItemList>
                    {shelters.map((shelter) => (
                      <Item key={shelter.id}>
                        <ItemTitle>{shelter.name}</ItemTitle>
                        <ItemDetail>
                          <span>{t.capacity}:</span>
                          <span>{shelter.capacity}</span>
                        </ItemDetail>
                        <ItemDetail>
                          <span>{t.available}:</span>
                          <span>{shelter.available}</span>
                        </ItemDetail>
                        <ItemDetail>
                          <span>{t.facilities}:</span>
                          <span>{shelter.facilities.join(', ')}</span>
                        </ItemDetail>
                        <EmergencyButton
                          onClick={() => handleCall(shelter.contact)}
                        >
                          📞 {t.contact}
                        </EmergencyButton>
                      </Item>
                    ))}
                  </ItemList>
                ) : (
                  <ItemContent>
                    {loading ? t.loading : t.noDataAvailable}
                  </ItemContent>
                )}
              </SectionBody>
            </SectionContent>
          </Section>

          {/* Evacuation Routes */}
          <Section>
            <SectionHeader
              isExpanded={expandedSections.routes}
              onClick={() => toggleSection('routes')}
            >
              🛣️ {t.evacuationRoutes}
            </SectionHeader>
            <SectionContent isExpanded={expandedSections.routes}>
              <SectionBody>
                {evacuationRoutes.length > 0 ? (
                  <ItemList>
                    {evacuationRoutes.map((route) => (
                      <Item key={route.id}>
                        <ItemTitle>{route.name}</ItemTitle>
                        <ItemDetail>
                          <span>{t.status}:</span>
                          <StatusText status={route.status}>
                            {route.status.toUpperCase()}
                          </StatusText>
                        </ItemDetail>
                        <ItemDetail>
                          <span>{t.estimatedTime}:</span>
                          <span>{route.estimatedTime}</span>
                        </ItemDetail>
                      </Item>
                    ))}
                  </ItemList>
                ) : (
                  <ItemContent>
                    {loading ? t.loading : t.noDataAvailable}
                  </ItemContent>
                )}
              </SectionBody>
            </SectionContent>
          </Section>

          {/* Safety Tips */}
          <Section>
            <SectionHeader
              isExpanded={expandedSections.safety}
              onClick={() => toggleSection('safety')}
            >
              🛡️ {t.safetyTips}
            </SectionHeader>
            <SectionContent isExpanded={expandedSections.safety}>
              <SectionBody>
                {safetyTips.length > 0 ? (
                  <ItemList>
                    {safetyTips.map((tip) => (
                      <Item key={tip.id}>
                        <ItemTitle>{tip.title}</ItemTitle>
                        <div>
                          {tip.tips.map((tipText, index) => (
                            <ItemContent
                              key={index}
                              style={{ marginBottom: '8px' }}
                            >
                              • {tipText}
                            </ItemContent>
                          ))}
                        </div>
                      </Item>
                    ))}
                  </ItemList>
                ) : (
                  <ItemContent>
                    {loading ? t.loading : t.noDataAvailable}
                  </ItemContent>
                )}
              </SectionBody>
            </SectionContent>
          </Section>
        </PanelContent>
      </PanelContainer>
    </>
  )
}

export default SidePanel
