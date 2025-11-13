/**
 * Device Data Transformation
 * Converts raw CSV data from Intune and Jamf into unified Device types
 */

import { Device, DeviceStatus, OSType } from '@/types/device'
import { IntuneRawData, JamfRawData, parseDate, yearsBetween, daysBetween } from './csvParser'

/**
 * Transform Jamf CSV data into Device objects
 */
export function transformJamfData(jamfData: JamfRawData[]): Device[] {
  const now = new Date()

  return jamfData.map((raw, index) => {
    // Parse dates
    const warrantyExpiration = parseDate(raw['Warranty Expiration'])
    const lastCheckIn = parseDate(raw['Last Check-in']) || now
    const lastInventoryUpdate = parseDate(raw['Last Inventory Update']) || lastCheckIn

    // Calculate device age from warranty expiration (typically 3 years from purchase)
    let ageInYears = 0
    let purchaseDate: Date | undefined
    if (warrantyExpiration) {
      // Estimate purchase date as 3 years before warranty expiration
      purchaseDate = new Date(warrantyExpiration)
      purchaseDate.setFullYear(purchaseDate.getFullYear() - 3)
      ageInYears = yearsBetween(purchaseDate, now)
    }

    // Extract OS version
    const osVersion = raw['Operating System Version'] || 'Unknown'
    const osType: OSType = 'macOS'

    // Extract user info
    const emailAddress = raw['Email Address'] || raw.Username || ''
    const fullName = raw['Full Name'] || ''
    const owner = fullName || emailAddress || 'Unassigned'

    // Calculate days since last update
    const daysSinceUpdate = daysBetween(lastInventoryUpdate, now)

    // Determine device status with detailed reasons
    const { status, statusReason, statusReasons } = determineDeviceStatusWithReasons(
      ageInYears,
      daysSinceUpdate,
      osVersion,
      raw.Model
    )

    // Check if replacement is recommended
    const replacementRecommended = shouldReplace(ageInYears, osVersion, raw.Model)
    const replacementReason = getReplacementReason(ageInYears, osVersion, raw.Model)

    const device: Device = {
      id: `jamf-${raw['Serial Number'] || index}`,
      name: raw['Computer Name'] || `Unknown-${index}`,
      owner,
      ownerEmail: emailAddress,
      department: raw.Department || undefined,
      osType,
      osVersion,
      manufacturer: raw.Make || 'Apple',
      model: raw.Model || 'Unknown Model',
      serialNumber: raw['Serial Number'] || undefined,
      purchaseDate,
      lastSeen: lastCheckIn,
      ageInYears: parseFloat(ageInYears.toFixed(1)),
      status,
      source: 'jamf',
      processor: raw['Processor Type'] || undefined,
      isCompliant: raw.Managed === 'Managed' && raw.Supervised === 'Yes',
      lastUpdateDate: lastInventoryUpdate,
      daysSinceUpdate,
      replacementRecommended,
      replacementReason: replacementRecommended ? replacementReason : undefined,
      statusReason,
      statusReasons,
    }

    return device
  })
}

/**
 * Transform Intune CSV data into Device objects
 */
export function transformIntuneData(intuneData: IntuneRawData[]): Device[] {
  const now = new Date()

  return intuneData.map((raw, index) => {
    // Parse dates
    const lastModified = parseDate(raw.PspdpuLastModifiedTimeUtc) || now

    // Extract user info
    const emailAddress = raw.UPN || ''
    const owner = emailAddress ? emailAddress.split('@')[0] : 'Unassigned'

    // Calculate days since last update
    const daysSinceUpdate = daysBetween(lastModified, now)

    // We don't have age data from Intune CSV, so estimate based on device name patterns
    // FBS-* devices with years in name like "2022", "2023", etc.
    const yearMatch = raw.DeviceName.match(/-(\d{4})/)
    let ageInYears = 0
    let purchaseDate: Date | undefined

    if (yearMatch) {
      const year = parseInt(yearMatch[1])
      purchaseDate = new Date(year, 0, 1)
      ageInYears = yearsBetween(purchaseDate, now)
    }

    // Determine OS type from device naming convention
    // BA- or FBS- prefixes are typically Windows devices in your environment
    const osType: OSType = 'Windows'
    const osVersion = 'Unknown' // Not available in Intune CSV
    const model = 'Surface Pro / Dell' // Generic - not available in CSV

    // Determine device status with detailed reasons
    const { status, statusReason, statusReasons } = determineDeviceStatusWithReasons(
      ageInYears,
      daysSinceUpdate,
      osVersion,
      model
    )

    // Check if replacement is recommended
    const replacementRecommended = shouldReplace(ageInYears, osVersion, raw.DeviceName)
    const replacementReason = getReplacementReason(ageInYears, osVersion, raw.DeviceName)

    const device: Device = {
      id: `intune-${raw.DeviceName}-${index}`,
      name: raw.DeviceName || `Unknown-${index}`,
      owner,
      ownerEmail: emailAddress || undefined,
      osType,
      osVersion,
      model,
      lastSeen: lastModified,
      ageInYears: parseFloat(ageInYears.toFixed(1)),
      status,
      source: 'intune',
      purchaseDate,
      isCompliant: raw.ReportStatus === 'Succeeded',
      lastUpdateDate: lastModified,
      daysSinceUpdate,
      replacementRecommended,
      replacementReason: replacementRecommended ? replacementReason : undefined,
      statusReason,
      statusReasons,
    }

    return device
  })
}

/**
 * Determine device status based on age and update frequency
 */
function determineDeviceStatus(
  ageInYears: number,
  daysSinceUpdate: number,
  osVersion: string
): DeviceStatus {
  // Critical: Device is too old or severely out of date
  if (ageInYears >= 5) return 'critical'
  if (daysSinceUpdate > 90) return 'critical'

  // Check for outdated OS versions
  if (osVersion.includes('10.')) return 'critical' // macOS 10.x is very old
  if (osVersion.includes('11.')) return 'warning' // macOS 11 is aging

  // Warning: Device is aging or moderately out of date
  if (ageInYears >= 3) return 'warning'
  if (daysSinceUpdate > 30) return 'warning'

  // Good: Device is recent and up to date
  if (ageInYears < 3 && daysSinceUpdate <= 30) return 'good'

  return 'unknown'
}

/**
 * Determine device status with detailed reasons for administrators
 */
function determineDeviceStatusWithReasons(
  ageInYears: number,
  daysSinceUpdate: number,
  osVersion: string,
  model: string
): { status: DeviceStatus; statusReason: string; statusReasons: string[] } {
  const reasons: string[] = []
  let status: DeviceStatus = 'good'

  // Check critical factors
  if (ageInYears >= 5) {
    status = 'critical'
    reasons.push(`Device is ${ageInYears.toFixed(1)} years old (exceeds 5-year lifecycle)`)
  }

  if (daysSinceUpdate > 90) {
    status = 'critical'
    reasons.push(`Device has not checked in for ${daysSinceUpdate} days (critical threshold: 90 days)`)
  }

  if (osVersion.includes('10.')) {
    status = 'critical'
    reasons.push('Running macOS 10.x which is no longer supported by Apple')
  }

  // Check warning factors (only if not already critical)
  if (status !== 'critical') {
    if (ageInYears >= 3) {
      status = 'warning'
      reasons.push(`Device is ${ageInYears.toFixed(1)} years old (approaching 5-year replacement cycle)`)
    }

    if (daysSinceUpdate > 30) {
      status = 'warning'
      reasons.push(`Device last updated ${daysSinceUpdate} days ago (recommended: within 30 days)`)
    }

    if (osVersion.includes('11.')) {
      status = 'warning'
      reasons.push('Running macOS 11 which is aging and should be upgraded')
    }

    if (model.includes('Intel') && !model.includes('M1') && !model.includes('M2') && !model.includes('M3') && !model.includes('M4')) {
      if (model.includes('2017') || model.includes('2018') || model.includes('2019')) {
        status = 'warning'
        reasons.push('Intel-based Mac from 2017-2019 (Apple Silicon offers better performance and efficiency)')
      }
    }
  }

  // If still good, add positive reasons
  if (status === 'good') {
    reasons.push(`Device is ${ageInYears.toFixed(1)} years old (within recommended lifecycle)`)
    reasons.push(`Device updated ${daysSinceUpdate} days ago (current and compliant)`)
    if (model.includes('M1') || model.includes('M2') || model.includes('M3') || model.includes('M4')) {
      reasons.push('Running Apple Silicon (modern, efficient hardware)')
    }
  }

  // Create summary reason
  const statusReason = reasons.length > 0
    ? reasons.join('; ')
    : 'Status could not be determined from available data'

  return { status, statusReason, statusReasons: reasons }
}

/**
 * Determine if a device should be replaced
 */
function shouldReplace(ageInYears: number, osVersion: string, model: string): boolean {
  // Replace if older than 5 years
  if (ageInYears >= 5) return true

  // Replace if running very old OS that can't be updated
  if (osVersion.includes('10.')) return true

  // Replace old Intel Mac models
  if (model.includes('2017') || model.includes('2018')) return true
  if (model.includes('Intel') && !model.includes('M1') && !model.includes('M2') && !model.includes('M3')) {
    return true
  }

  return false
}

/**
 * Get reason for replacement recommendation
 */
function getReplacementReason(ageInYears: number, osVersion: string, model: string): string {
  const reasons: string[] = []

  if (ageInYears >= 6) {
    reasons.push('Device age exceeds 6 years')
  } else if (ageInYears >= 5) {
    reasons.push('Device age exceeds 5 years')
  }

  if (osVersion.includes('10.')) {
    reasons.push('Running unsupported macOS 10.x')
  } else if (osVersion.includes('11.')) {
    reasons.push('Running outdated macOS 11')
  }

  if (model.includes('2017') || model.includes('2018')) {
    reasons.push('Hardware from 2017-2018')
  }

  if (model.includes('Intel') && !model.includes('M1')) {
    reasons.push('Intel-based Mac (Apple Silicon recommended)')
  }

  return reasons.length > 0 ? reasons.join(', ') : 'General aging concerns'
}

/**
 * Merge and deduplicate devices from multiple sources
 */
export function mergeDevices(jamfDevices: Device[], intuneDevices: Device[]): Device[] {
  const allDevices = [...jamfDevices, ...intuneDevices]

  // Sort by status priority (critical first) then by age
  return allDevices.sort((a, b) => {
    const statusPriority = { critical: 0, warning: 1, good: 2, unknown: 3 }
    const priorityDiff = statusPriority[a.status] - statusPriority[b.status]

    if (priorityDiff !== 0) return priorityDiff

    // Within same status, sort by age (oldest first)
    return b.ageInYears - a.ageInYears
  })
}
