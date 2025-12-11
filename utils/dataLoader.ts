/**
 * Data Loader
 * Loads and processes CSV data from Intune and Jamf
 */

import { Device, DeviceSummary } from '@/types/device'
import { parseCSV, parseCSVMultiline, IntuneRawData, JamfRawData, BattenUserData, QualysAssetData, QualysVulnData, EntraDeviceData, AxoniusDeviceData } from './csvParser'
import { transformJamfData, transformIntuneData, mergeDevices, mergeQualysData, mergeEntraData, transformAxoniusData } from './deviceTransform'

// User lookup map for matching computing IDs
let battenUsersMap: Map<string, BattenUserData> | null = null

// Entra device-to-user lookup map
let entraDeviceMap: Map<string, EntraDeviceData> | null = null

// LocalStorage keys for uploaded CSV data
const STORAGE_KEYS = {
  jamf: 'battenIT_jamf_csv',
  intune: 'battenIT_intune_csv',
  users: 'battenIT_users_csv',
  coreview: 'battenIT_coreview_csv',
  qualys: 'battenIT_qualys_csv',
}

/**
 * Save CSV data to localStorage
 */
export function saveCSVToStorage(type: 'jamf' | 'intune' | 'users' | 'coreview' | 'qualys', csvText: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS[type], csvText)
    console.log(`Saved ${type} CSV to localStorage`)
  } catch (error) {
    console.error(`Error saving ${type} CSV to localStorage:`, error)
    throw error
  }
}

/**
 * Get CSV data from localStorage or fall back to public directory
 */
async function getCSVData(type: 'jamf' | 'intune' | 'users' | 'coreview' | 'qualys'): Promise<string | null> {
  // Try localStorage first
  const stored = localStorage.getItem(STORAGE_KEYS[type])
  if (stored) {
    console.log(`Using uploaded ${type} CSV from localStorage`)
    return stored
  }

  // Fall back to public directory files
  try {
    const fileName = type === 'jamf' ? '/Jamf.csv'
      : type === 'intune' ? '/InTune.csv'
      : type === 'coreview' ? '/CoreView.csv'
      : type === 'qualys' ? '/QualysAssets.csv'
      : '/groupExportAll_FBS_Community.csv'
    const response = await fetch(fileName)
    if (response.ok) {
      console.log(`Using default ${type} CSV from ${fileName}`)
      return await response.text()
    }
  } catch (error) {
    console.warn(`Error loading default ${type} CSV:`, error)
  }

  return null
}

/**
 * Clear all uploaded CSV data from localStorage
 */
export function clearUploadedCSVs(): void {
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key))
  battenUsersMap = null // Reset cache
  console.log('Cleared all uploaded CSV data')
}

/**
 * Load Batten user data from CSV file
 */
async function loadBattenUsers(): Promise<Map<string, BattenUserData>> {
  if (battenUsersMap) {
    return battenUsersMap
  }

  try {
    const text = await getCSVData('users')
    if (!text) {
      console.warn('Batten users CSV not found')
      battenUsersMap = new Map()
      return battenUsersMap
    }

    const users = parseCSV<BattenUserData>(text)

    // Create map with computing ID (uid) as key
    battenUsersMap = new Map()
    users.forEach(user => {
      if (user.uid) {
        battenUsersMap!.set(user.uid.toLowerCase(), user)
      }
    })

    console.log(`Loaded ${battenUsersMap.size} Batten users`)
    return battenUsersMap
  } catch (error) {
    console.error('Error loading Batten users:', error)
    battenUsersMap = new Map()
    return battenUsersMap
  }
}

/**
 * Load Entra device data from CSV files (BA- and FBS- prefixed devices)
 * Creates a map of device name -> user info for matching
 * Handles duplicate entries by keeping the most recent login with a valid user
 */
async function loadEntraDevices(): Promise<Map<string, EntraDeviceData>> {
  if (entraDeviceMap) {
    return entraDeviceMap
  }

  entraDeviceMap = new Map()

  // List of Entra CSV files to try loading
  const entraFiles = [
    '/Batten Entra Devices with BA- Display Name.csv',
    '/Batten Entra Devices with FBS- Display Name.csv'
  ]

  for (const fileName of entraFiles) {
    try {
      const response = await fetch(fileName)
      if (response.ok) {
        const text = await response.text()
        const devices = parseCSV<EntraDeviceData>(text)

        devices.forEach(device => {
          const deviceName = device['Display name']?.trim()
          if (!deviceName) return

          const key = deviceName.toUpperCase()
          const existingDevice = entraDeviceMap!.get(key)

          // Determine if we should use this entry over existing one
          let shouldUse = !existingDevice

          if (existingDevice) {
            const existingHasUser = !!existingDevice['User principal name']?.trim()
            const newHasUser = !!device['User principal name']?.trim()
            const existingTimestamp = existingDevice['Approximate last logon timestamp'] || ''
            const newTimestamp = device['Approximate last logon timestamp'] || ''

            // Priority: entry with user > entry without user
            // If both have users or both don't, prefer more recent
            if (newHasUser && !existingHasUser) {
              shouldUse = true
            } else if (existingHasUser && !newHasUser) {
              shouldUse = false
            } else {
              // Both have users or both don't - use more recent timestamp
              shouldUse = newTimestamp > existingTimestamp
            }
          }

          if (shouldUse) {
            entraDeviceMap!.set(key, device)
          }
        })

        console.log(`📋 Loaded ${devices.length} Entra records from ${fileName}`)
      }
    } catch (error) {
      console.warn(`Could not load Entra file ${fileName}:`, error)
    }
  }

  console.log(`📋 Total unique Entra device mappings: ${entraDeviceMap.size}`)
  return entraDeviceMap
}

/**
 * Extract computing IDs from device name
 * Device names often contain computing IDs like "FBS-bh4hb-2023" or "BA-abc3xy" or "FBS-CQK8GH-3460"
 */
export function extractComputingIdsFromDeviceName(deviceName: string): string[] {
  const ids: string[] = []

  // Pattern 1: FBS-{computingId}-{optional suffix} (case insensitive)
  // Pattern 2: BA-{computingId} (case insensitive)
  // Pattern 3: Email addresses
  // Computing IDs are typically 4-7 characters with mixed letters and digits (e.g., bnw9q, hld8m, asp2d)
  const patterns = [
    /FBS-([a-zA-Z0-9]{4,7})(?:-|$)/g,
    /BA-([a-zA-Z0-9]{4,7})(?:-|$|@)/g,
    /\b([a-zA-Z0-9]{4,7})@virginia\.edu/g,
  ]

  patterns.forEach(pattern => {
    const matches = deviceName.matchAll(pattern)
    for (const match of matches) {
      const id = match[1].toLowerCase()
      // Filter out common false positives (serial numbers, etc)
      // Real computing IDs have letters, not all uppercase serial-looking patterns
      if (id && !ids.includes(id) && id.length >= 4) {
        console.log(`🔍 Extracted computing ID "${id}" from device "${deviceName}"`)
        ids.push(id)
      } else if (id && id.length < 4) {
        console.log(`⚠️  Rejected computing ID "${id}" from device "${deviceName}" (too short: ${id.length} chars)`)
      }
    }
  })

  if (ids.length === 0) {
    console.log(`ℹ️  No computing IDs found in device "${deviceName}"`)
  }

  return ids
}

/**
 * Load device data from CSV files
 * Uses Axonius as primary source if available, falls back to Jamf/Intune
 */
export async function loadDeviceData(): Promise<Device[]> {
  try {
    // Load Batten users first
    const usersMap = await loadBattenUsers()

    // Try to load Axonius data first (primary source)
    let axoniusDevices: Device[] = []
    try {
      const axoniusFileName = '/NewAxoniusExport.csv'
      const axoniusResponse = await fetch(axoniusFileName)
      if (axoniusResponse.ok) {
        console.log('📊 Loading Axonius data as primary source...')
        const axoniusText = await axoniusResponse.text()
        const axoniusData = parseCSVMultiline<AxoniusDeviceData>(axoniusText)
        console.log(`Loaded ${axoniusData.length} total records from Axonius`)
        axoniusDevices = transformAxoniusData(axoniusData, usersMap)
      }
    } catch (error) {
      console.log('Axonius file not found, falling back to Jamf/Intune')
    }

    // If Axonius has devices, use it as primary source
    if (axoniusDevices.length > 0) {
      console.log(`✅ Using ${axoniusDevices.length} devices from Axonius`)

      // Filter out devices that haven't checked in for 6+ months (180 days)
      const activeDevices = axoniusDevices.filter(device => {
        const now = new Date()
        const daysSinceLastSeen = Math.floor((now.getTime() - device.lastSeen.getTime()) / (1000 * 60 * 60 * 24))
        if (daysSinceLastSeen > 180) {
          console.log(`🗑️  Filtering out device ${device.name}: last seen ${daysSinceLastSeen} days ago (> 6 months)`)
          return false
        }
        return true
      })

      console.log(`Total devices (filtered): ${activeDevices.length} (excluded ${axoniusDevices.length - activeDevices.length} devices not seen in 6+ months)`)
      return activeDevices
    }

    // Fall back to Jamf/Intune if no Axonius data
    console.log('📊 Falling back to Jamf/Intune data...')

    // Load Entra device-to-user mappings
    const entraMap = await loadEntraDevices()

    // Get CSV data from localStorage or public directory
    const intuneText = await getCSVData('intune')
    const jamfText = await getCSVData('jamf')

    if (!intuneText && !jamfText) {
      console.warn('No CSV files found')
      return []
    }

    // Parse CSV data
    const intuneData = intuneText ? parseCSV<IntuneRawData>(intuneText) : []
    const jamfData = jamfText ? parseCSV<JamfRawData>(jamfText) : []

    console.log(`Loaded ${intuneData.length} Intune devices`)
    console.log(`Loaded ${jamfData.length} Jamf devices`)

    // Transform to Device objects (pass users map)
    const intuneDevices = transformIntuneData(intuneData, usersMap)
    const jamfDevices = transformJamfData(jamfData, usersMap)

    // Merge devices
    let allDevices = mergeDevices(jamfDevices, intuneDevices)

    // Merge Entra data for better user matching
    if (entraMap.size > 0) {
      console.log('📋 Merging Entra device-to-user data...')
      allDevices = mergeEntraData(allDevices, entraMap, usersMap)
    }

    // Load and merge Qualys data if available
    const qualysAssetsText = await getCSVData('qualys')
    if (qualysAssetsText) {
      console.log('🔒 Loading Qualys data...')
      const qualysAssets = parseCSV<QualysAssetData>(qualysAssetsText)
      console.log(`Loaded ${qualysAssets.length} Qualys assets`)

      // Try to load vulnerabilities CSV (check for both file naming patterns)
      let qualysVulns: QualysVulnData[] = []

      // Try to get vulnerability data from localStorage or public directory
      // User might upload "BA_Sev4-5_Vulnerabilities_All_By_Host.csv"
      try {
        const vulnFileName = '/BA_Sev4-5_Vulnerabilities_All_By_Host.csv'
        const response = await fetch(vulnFileName)
        if (response.ok) {
          const vulnText = await response.text()
          qualysVulns = parseCSV<QualysVulnData>(vulnText)
          console.log(`Loaded ${qualysVulns.length} Qualys vulnerabilities from ${vulnFileName}`)
        }
      } catch (error) {
        console.log('No Qualys vulnerabilities file found - continuing with assets only')
      }

      // Merge Qualys data
      allDevices = mergeQualysData(allDevices, qualysAssets, qualysVulns)
    }

    // Filter out devices that haven't checked in for 3+ months (90 days)
    const activeDevices = allDevices.filter(device => {
      const daysSinceUpdate = device.daysSinceUpdate || 0
      if (daysSinceUpdate > 90) {
        console.log(`🗑️  Filtering out device ${device.name}: last seen ${daysSinceUpdate} days ago (> 3 months)`)
        return false
      }
      return true
    })

    console.log(`Total devices (filtered): ${activeDevices.length} (excluded ${allDevices.length - activeDevices.length} devices not seen in 3+ months)`)
    return activeDevices
  } catch (error) {
    console.error('Error loading device data:', error)
    return []
  }
}

/**
 * Calculate summary metrics from device list
 * Retired devices are excluded from most counts but tracked separately
 */
export function calculateDeviceSummary(devices: Device[]): DeviceSummary {
  // Separate retired and active devices
  const retiredCount = devices.filter(d => d.isRetired).length
  const activeDeviceList = devices.filter(d => !d.isRetired)

  const totalDevices = activeDeviceList.length

  const criticalCount = activeDeviceList.filter(d => d.status === 'critical').length
  const warningCount = activeDeviceList.filter(d => d.status === 'warning').length
  const goodCount = activeDeviceList.filter(d => d.status === 'good').length
  const inactiveCount = activeDeviceList.filter(d => d.status === 'inactive').length
  const unknownCount = activeDeviceList.filter(d => d.status === 'unknown').length

  // Activity status counts
  const activeDevices = activeDeviceList.filter(d => d.activityStatus === 'active').length
  const inactiveDevices = activeDeviceList.filter(d => d.activityStatus === 'inactive').length

  // Calculate average age only for devices where we know the age (exclude 0 years)
  const devicesWithKnownAge = activeDeviceList.filter(d => d.ageInYears > 0)
  const averageAge = devicesWithKnownAge.length > 0
    ? devicesWithKnownAge.reduce((sum, d) => sum + d.ageInYears, 0) / devicesWithKnownAge.length
    : 0

  const devicesNeedingReplacement = activeDeviceList.filter(d => d.replacementRecommended).length
  const outOfDateDevices = activeDeviceList.filter(d => (d.daysSinceUpdate || 0) > 30).length
  const vulnerableDevices = activeDeviceList.filter(d => (d.vulnerabilityCount || 0) > 5).length

  // Qualys security metrics
  const devicesWithQualys = activeDeviceList.filter(d => d.qualysAgentId)
  const devicesWithQualysData = devicesWithQualys.length
  const totalVulnerabilities = devicesWithQualys.reduce((sum, d) => sum + (d.vulnerabilityCount || 0), 0)
  const criticalVulnerabilities = devicesWithQualys.reduce((sum, d) => sum + (d.criticalVulnCount || 0), 0)
  const devicesWithTruRisk = devicesWithQualys.filter(d => d.truRiskScore !== undefined)
  const averageTruRiskScore = devicesWithTruRisk.length > 0
    ? devicesWithTruRisk.reduce((sum, d) => sum + (d.truRiskScore || 0), 0) / devicesWithTruRisk.length
    : undefined

  return {
    totalDevices,
    criticalCount,
    warningCount,
    goodCount,
    inactiveCount,
    unknownCount,
    activeDevices,
    inactiveDevices,
    averageAge: parseFloat(averageAge.toFixed(1)),
    devicesNeedingReplacement,
    outOfDateDevices,
    vulnerableDevices,
    retiredCount,
    devicesWithQualysData,
    totalVulnerabilities,
    criticalVulnerabilities,
    averageTruRiskScore: averageTruRiskScore ? parseFloat(averageTruRiskScore.toFixed(1)) : undefined,
  }
}

/**
 * Filter devices by various criteria
 */
export function filterDevices(
  devices: Device[],
  filters: {
    status?: string[]
    osType?: string[]
    source?: string[]
    replacementOnly?: boolean
    searchTerm?: string
  }
): Device[] {
  return devices.filter(device => {
    // Status filter
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(device.status)) return false
    }

    // OS Type filter
    if (filters.osType && filters.osType.length > 0) {
      if (!filters.osType.includes(device.osType)) return false
    }

    // Source filter
    if (filters.source && filters.source.length > 0) {
      if (!filters.source.includes(device.source)) return false
    }

    // Replacement filter
    if (filters.replacementOnly && !device.replacementRecommended) {
      return false
    }

    // Search term
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase()
      const searchable = [
        device.name,
        device.owner,
        device.model,
        device.serialNumber,
        device.department,
      ].filter(Boolean).join(' ').toLowerCase()

      if (!searchable.includes(term)) return false
    }

    return true
  })
}

/**
 * Load device data synchronously from static imports
 */
export function loadDeviceDataSync(): Device[] {
  // This will need to be implemented when we have a way to read files synchronously
  // For now, return empty array and use async version
  return []
}

/**
 * User data for autocomplete
 */
export interface UserAutocompleteData {
  uid: string
  name: string
  email: string
}

/**
 * Load all Batten users for autocomplete functionality
 */
export async function loadUsersForAutocomplete(): Promise<UserAutocompleteData[]> {
  try {
    const text = await getCSVData('users')
    if (!text) {
      console.warn('Users CSV not found for autocomplete')
      return []
    }

    const users = parseCSV<BattenUserData>(text)

    // Transform to autocomplete format, filter out invalid entries
    const autocompleteUsers: UserAutocompleteData[] = users
      .filter(user => user.uid && user.name && user.mail)
      .map(user => ({
        uid: user.uid,
        name: user.name,
        email: user.mail,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    console.log(`Loaded ${autocompleteUsers.length} users for autocomplete`)
    return autocompleteUsers
  } catch (error) {
    console.error('Error loading users for autocomplete:', error)
    return []
  }
}
