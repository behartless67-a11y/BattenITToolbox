/**
 * Data Loader
 * Loads and processes CSV data from Intune and Jamf
 */

import { Device, DeviceSummary } from '@/types/device'
import { parseCSV, IntuneRawData, JamfRawData } from './csvParser'
import { transformJamfData, transformIntuneData, mergeDevices } from './deviceTransform'
import IntuneCSV from '../InTune.csv'
import JamfCSV from '../Jamf.csv'

/**
 * Load device data from CSV files
 */
export async function loadDeviceData(): Promise<Device[]> {
  try {
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

    // Transform to Device objects
    const intuneDevices = transformIntuneData(intuneData)
    const jamfDevices = transformJamfData(jamfData)

    // Merge and return
    const allDevices = mergeDevices(jamfDevices, intuneDevices)

    console.log(`Total devices: ${allDevices.length}`)
    return allDevices
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
  const unknownCount = devices.filter(d => d.status === 'unknown').length

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
    unknownCount,
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
