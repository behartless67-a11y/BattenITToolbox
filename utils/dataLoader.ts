/**
 * Data Loader
 * Loads and processes CSV data from Intune and Jamf
 */

import { Device, DeviceSummary } from '@/types/device'
import { parseCSV, IntuneRawData, JamfRawData, BattenUserData } from './csvParser'
import { transformJamfData, transformIntuneData, mergeDevices } from './deviceTransform'
import IntuneCSV from '../InTune.csv'
import JamfCSV from '../Jamf.csv'

// User lookup map for matching computing IDs
let battenUsersMap: Map<string, BattenUserData> | null = null

/**
 * Load Batten user data from CSV file
 */
async function loadBattenUsers(): Promise<Map<string, BattenUserData>> {
  if (battenUsersMap) {
    return battenUsersMap
  }

  try {
    const response = await fetch('/groupExportAll_FBS_Community.csv')
    if (!response.ok) {
      console.warn('Batten users CSV not found')
      battenUsersMap = new Map()
      return battenUsersMap
    }

    const text = await response.text()
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
 * Extract computing IDs from device name
 * Device names often contain computing IDs like "FBS-bh4hb-2023" or "BA-abc3xy" or "FBS-CQK8GH-3460"
 */
export function extractComputingIdsFromDeviceName(deviceName: string): string[] {
  const ids: string[] = []

  // Pattern 1: FBS-{computingId}-{optional suffix} (case insensitive)
  // Pattern 2: BA-{computingId} (case insensitive)
  // Pattern 3: Email addresses
  // Computing IDs are typically 2-7 letters followed by optional 0-3 digits
  const patterns = [
    /FBS-([a-zA-Z]{2,7}\d{0,3})/g,
    /BA-([a-zA-Z]{2,7}\d{0,3})/g,
    /\b([a-zA-Z]{2,7}\d{0,3})@virginia\.edu/g,
  ]

  patterns.forEach(pattern => {
    const matches = deviceName.matchAll(pattern)
    for (const match of matches) {
      const id = match[1].toLowerCase()
      // Filter out common false positives (serial numbers, etc)
      // Real computing IDs have letters, not all uppercase serial-looking patterns
      if (id && !ids.includes(id) && id.length >= 4) {
        ids.push(id)
      }
    }
  })

  return ids
}

/**
 * Load device data from CSV files
 */
export async function loadDeviceData(): Promise<Device[]> {
  try {
    // Load Batten users first
    const usersMap = await loadBattenUsers()

    // Read CSV files
    const intuneResponse = await fetch('/InTune.csv')
    const jamfResponse = await fetch('/Jamf.csv')

    if (!intuneResponse.ok || !jamfResponse.ok) {
      console.warn('CSV files not found, using empty data')
      return []
    }

    const intuneText = await intuneResponse.text()
    const jamfText = await jamfResponse.text()

    // Parse CSV data
    const intuneData = parseCSV<IntuneRawData>(intuneText)
    const jamfData = parseCSV<JamfRawData>(jamfText)

    console.log(`Loaded ${intuneData.length} Intune devices`)
    console.log(`Loaded ${jamfData.length} Jamf devices`)

    // Transform to Device objects (pass users map)
    const intuneDevices = transformIntuneData(intuneData, usersMap)
    const jamfDevices = transformJamfData(jamfData, usersMap)

    // Merge devices
    const allDevices = mergeDevices(jamfDevices, intuneDevices)

    // Filter out devices that haven't checked in for 6+ months (180 days)
    const activeDevices = allDevices.filter(device => {
      const daysSinceUpdate = device.daysSinceUpdate || 0
      if (daysSinceUpdate > 180) {
        console.log(`🗑️  Filtering out device ${device.name}: last seen ${daysSinceUpdate} days ago (> 6 months)`)
        return false
      }
      return true
    })

    console.log(`Total devices (filtered): ${activeDevices.length} (excluded ${allDevices.length - activeDevices.length} devices not seen in 6+ months)`)
    return activeDevices
  } catch (error) {
    console.error('Error loading device data:', error)
    return []
  }
}

/**
 * Calculate summary metrics from device list
 */
export function calculateDeviceSummary(devices: Device[]): DeviceSummary {
  const totalDevices = devices.length

  const criticalCount = devices.filter(d => d.status === 'critical').length
  const warningCount = devices.filter(d => d.status === 'warning').length
  const goodCount = devices.filter(d => d.status === 'good').length
  const inactiveCount = devices.filter(d => d.status === 'inactive').length
  const unknownCount = devices.filter(d => d.status === 'unknown').length

  // Activity status counts
  const activeDevices = devices.filter(d => d.activityStatus === 'active').length
  const inactiveDevices = devices.filter(d => d.activityStatus === 'inactive').length

  const averageAge = devices.length > 0
    ? devices.reduce((sum, d) => sum + d.ageInYears, 0) / devices.length
    : 0

  const devicesNeedingReplacement = devices.filter(d => d.replacementRecommended).length
  const outOfDateDevices = devices.filter(d => (d.daysSinceUpdate || 0) > 30).length
  const vulnerableDevices = devices.filter(d => (d.vulnerabilityCount || 0) > 5).length

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
