/**
 * Device Data Transformation
 * Converts raw CSV data from Intune and Jamf into unified Device types
 */

import { Device, DeviceStatus, OSType, Vulnerability, ActivityStatus } from '@/types/device'
import { IntuneRawData, JamfRawData, BattenUserData, QualysAssetData, QualysVulnData, EntraDeviceData, AxoniusDeviceData, parseDate, yearsBetween, daysBetween } from './csvParser'
import { extractComputingIdsFromDeviceName } from './dataLoader'
import { lookupModelName, getManufacturerFromModel, calculateAgeFromModel, getModelReleaseYear } from './modelLookup'

/**
 * IT staff who provision devices (should not be primary owners)
 * When these users appear as primary owners, swap with actual user from device name
 */
const IT_PROVISIONERS = new Set([
  'bh4hb',
  'jww8je',
  'bh4hb@virginia.edu',
  'jww8je@virginia.edu',
  'Jeffrey Wayne Whelchel',
  'Whelchel, Jeffrey Wayne',
  'Hartless, Ben',
  'Ben Hartless',
])

/**
 * Check if a user is an IT provisioner (should not be primary owner)
 */
function isITProvisioner(owner: string, email?: string): boolean {
  if (IT_PROVISIONERS.has(owner)) return true
  if (email && IT_PROVISIONERS.has(email)) return true
  if (email && IT_PROVISIONERS.has(email.split('@')[0])) return true

  // Check if owner name contains a provisioner's computing ID in parentheses
  // e.g., "Whelchel, Jeffrey Wayne (jww8je)"
  const idMatch = owner.match(/\(([a-zA-Z0-9]+)\)/)
  if (idMatch && IT_PROVISIONERS.has(idMatch[1].toLowerCase())) return true
  if (idMatch && IT_PROVISIONERS.has(idMatch[1])) return true

  // Check for partial name matches
  const ownerLower = owner.toLowerCase()
  if (ownerLower.includes('whelchel') || ownerLower.includes('jww8je')) return true
  if (ownerLower.includes('hartless') || ownerLower.includes('bh4hb')) return true

  return false
}

/**
 * Transform Jamf CSV data into Device objects
 */
export function transformJamfData(jamfData: JamfRawData[], usersMap?: Map<string, BattenUserData>): Device[] {
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

    // If no warranty date, try to extract year from model name (e.g., "MacBook Pro (M1, 2020)")
    if (!purchaseDate && raw.Model) {
      const modelYearMatch = raw.Model.match(/\b(20[1-2]\d)\b/)
      if (modelYearMatch) {
        const year = parseInt(modelYearMatch[1])
        if (year >= 2015 && year <= 2030) {
          purchaseDate = new Date(year, 0, 1)
          ageInYears = yearsBetween(purchaseDate, now)
          console.log(`📅 Extracted year ${year} from model "${raw.Model}" for device ${raw['Computer Name']}`)
        }
      }
    }

    // Extract OS version
    const osVersion = raw['Operating System Version'] || 'Unknown'
    const osType: OSType = 'macOS'

    // Extract user info from CSV
    const emailAddress = raw['Email Address'] || raw.Username || ''
    const fullName = raw['Full Name'] || ''
    const owner = fullName || emailAddress || 'Unassigned'
    let additionalOwner: string | undefined = undefined

    // Try to match computing ID from device name to add as additional owner
    if (usersMap && raw['Computer Name']) {
      const computingIds = extractComputingIdsFromDeviceName(raw['Computer Name'])
      if (computingIds.length > 0) {
        console.log(`🔎 Attempting to match computing IDs [${computingIds.join(', ')}] for device "${raw['Computer Name']}"`)
        for (const computingId of computingIds) {
          const matchedUser = usersMap.get(computingId)
          if (matchedUser) {
            // Add as additional owner (don't replace existing owner)
            additionalOwner = matchedUser.name || matchedUser.mail
            console.log(`✓ Added additional owner for device ${raw['Computer Name']}: ${matchedUser.name} (${computingId})`)
            break // Use first match
          } else {
            console.log(`❌ No match found in directory for computing ID "${computingId}" (device: ${raw['Computer Name']})`)
          }
        }
      }
    }

    // If no match from device name and we have email, try matching from email
    if (!additionalOwner && emailAddress && usersMap) {
      const emailId = emailAddress.split('@')[0].toLowerCase()
      const matchedUser = usersMap.get(emailId)
      if (matchedUser && matchedUser.name !== fullName) {
        // Only add if it's different from the fullName we already have
        additionalOwner = matchedUser.name || matchedUser.mail
        console.log(`✓ Added additional owner via email for device ${raw['Computer Name']}: ${matchedUser.name} (${emailId})`)
      }
    }

    // Swap primary and additional owner if needed
    let finalOwner = owner
    let finalAdditionalOwner = additionalOwner

    // Case 1: Primary is IT provisioner - swap with actual user
    if (isITProvisioner(owner, emailAddress) && additionalOwner) {
      finalOwner = additionalOwner
      finalAdditionalOwner = `${owner} (IT Provisioner)`
      console.log(`🔄 Swapped owners for device ${raw['Computer Name']}: ${finalOwner} is now primary, ${owner} is IT provisioner`)
    }
    // Case 2: Primary is "Unassigned" but we found a real user - promote to primary
    else if (owner === 'Unassigned' && additionalOwner) {
      finalOwner = additionalOwner
      finalAdditionalOwner = undefined
      console.log(`🔄 Promoted user for device ${raw['Computer Name']}: ${finalOwner} is now primary (was Unassigned)`)
    }

    // Calculate days since last update
    const daysSinceUpdate = daysBetween(lastInventoryUpdate, now)

    // Determine device status with detailed reasons
    const { status, statusReason, statusReasons, activityStatus } = determineDeviceStatusWithReasons(
      ageInYears,
      daysSinceUpdate,
      osVersion,
      raw.Model
    )

    // Check if replacement is recommended (3+ years per Batten policy)
    const replacementRecommended = shouldReplace(ageInYears, osVersion, raw.Model)
    const replacementReason = getReplacementReason(ageInYears, osVersion, raw.Model)

    const device: Device = {
      id: `jamf-${raw['Serial Number'] || index}`,
      name: raw['Computer Name'] || `Unknown-${index}`,
      owner: finalOwner,
      ownerEmail: emailAddress,
      additionalOwner: finalAdditionalOwner,
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
      activityStatus,
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
export function transformIntuneData(intuneData: IntuneRawData[], usersMap?: Map<string, BattenUserData>): Device[] {
  const now = new Date()

  // Deduplicate Intune data - keep entry with UPN over empty, or most recent if both have/don't have UPN
  const deviceMap = new Map<string, IntuneRawData>()
  intuneData.forEach(raw => {
    const deviceName = raw.DeviceName?.trim().toUpperCase()
    if (!deviceName) return

    const existing = deviceMap.get(deviceName)
    let shouldUse = !existing

    if (existing) {
      const existingHasUPN = !!existing.UPN?.trim()
      const newHasUPN = !!raw.UPN?.trim()
      const existingTimestamp = existing.PspdpuLastModifiedTimeUtc || ''
      const newTimestamp = raw.PspdpuLastModifiedTimeUtc || ''

      // Priority: entry with UPN > entry without UPN
      if (newHasUPN && !existingHasUPN) {
        shouldUse = true
      } else if (existingHasUPN && !newHasUPN) {
        shouldUse = false
      } else {
        // Both have UPN or both don't - use more recent
        shouldUse = newTimestamp > existingTimestamp
      }
    }

    if (shouldUse) {
      deviceMap.set(deviceName, raw)
    }
  })

  const deduplicatedData = Array.from(deviceMap.values())
  console.log(`📱 Intune: Deduplicated ${intuneData.length} records to ${deduplicatedData.length} unique devices`)

  return deduplicatedData.map((raw, index) => {
    // Parse dates
    const lastModified = parseDate(raw.PspdpuLastModifiedTimeUtc) || now

    // Extract user info from CSV
    const emailAddress = raw.UPN || ''
    const owner = emailAddress ? emailAddress.split('@')[0] : 'Unassigned'
    let additionalOwner: string | undefined = undefined

    // Try to match computing ID from device name to add as additional owner
    if (usersMap && raw.DeviceName) {
      const computingIds = extractComputingIdsFromDeviceName(raw.DeviceName)
      if (computingIds.length > 0) {
        console.log(`🔎 Attempting to match computing IDs [${computingIds.join(', ')}] for device "${raw.DeviceName}"`)
        for (const computingId of computingIds) {
          const matchedUser = usersMap.get(computingId)
          if (matchedUser) {
            // Add as additional owner (don't replace existing owner)
            additionalOwner = matchedUser.name || matchedUser.mail
            console.log(`✓ Added additional owner for device ${raw.DeviceName}: ${matchedUser.name} (${computingId})`)
            break // Use first match
          } else {
            console.log(`❌ No match found in directory for computing ID "${computingId}" (device: ${raw.DeviceName})`)
          }
        }
      }
    }

    // If no match from device name and we have UPN, try matching from UPN
    if (!additionalOwner && emailAddress && usersMap) {
      const upnId = emailAddress.split('@')[0].toLowerCase()
      const matchedUser = usersMap.get(upnId)
      if (matchedUser) {
        // Add directory name as additional owner
        additionalOwner = matchedUser.name || matchedUser.mail
        console.log(`✓ Added additional owner via UPN for device ${raw.DeviceName}: ${matchedUser.name} (${upnId})`)
      }
    }

    // Swap primary and additional owner if needed
    let finalOwner = owner
    let finalAdditionalOwner = additionalOwner

    // Case 1: Primary is IT provisioner - swap with actual user
    if (isITProvisioner(owner, emailAddress) && additionalOwner) {
      finalOwner = additionalOwner
      finalAdditionalOwner = `${owner} (IT Provisioner)`
      console.log(`🔄 Swapped owners for device ${raw.DeviceName}: ${finalOwner} is now primary, ${owner} is IT provisioner`)
    }
    // Case 2: Primary is "Unassigned" but we found a real user - promote to primary
    else if (owner === 'Unassigned' && additionalOwner) {
      finalOwner = additionalOwner
      finalAdditionalOwner = undefined
      console.log(`🔄 Promoted user for device ${raw.DeviceName}: ${finalOwner} is now primary (was Unassigned)`)
    }

    // Calculate days since last update
    const daysSinceUpdate = daysBetween(lastModified, now)

    // We don't have age data from Intune CSV, so estimate based on device name patterns
    // FBS-* devices with years in name like "2022", "2023", etc.
    // Only match realistic years (2015-2030) to avoid matching serial numbers
    const yearMatch = raw.DeviceName.match(/-(20[1-3]\d)(?:-|$)/g)
    let ageInYears = 0
    let purchaseDate: Date | undefined

    if (yearMatch && yearMatch.length > 0) {
      // Extract the year from the match (remove the leading hyphen)
      const yearStr = yearMatch[0].replace(/-/g, '')
      const year = parseInt(yearStr)

      // Validate it's a reasonable year (2015-2030)
      if (year >= 2015 && year <= 2030) {
        purchaseDate = new Date(year, 0, 1)
        ageInYears = yearsBetween(purchaseDate, now)
      }
    }

    // Determine OS type from device naming convention
    // BA- or FBS- prefixes are typically Windows devices in your environment
    const osType: OSType = 'Windows'
    const osVersion = 'Unknown' // Not available in Intune CSV
    const model = 'Surface Pro / Dell' // Generic - not available in CSV

    // Determine device status with detailed reasons
    const { status, statusReason, statusReasons, activityStatus } = determineDeviceStatusWithReasons(
      ageInYears,
      daysSinceUpdate,
      osVersion,
      model
    )

    // Check if replacement is recommended (3+ years per Batten policy)
    const replacementRecommended = shouldReplace(ageInYears, osVersion, raw.DeviceName)
    const replacementReason = getReplacementReason(ageInYears, osVersion, raw.DeviceName)

    const device: Device = {
      id: `intune-${raw.DeviceName}-${index}`,
      name: raw.DeviceName || `Unknown-${index}`,
      owner: finalOwner,
      ownerEmail: emailAddress || undefined,
      additionalOwner: finalAdditionalOwner,
      osType,
      osVersion,
      model,
      lastSeen: lastModified,
      ageInYears: parseFloat(ageInYears.toFixed(1)),
      status,
      activityStatus,
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
 * Updated criteria:
 * - Inactive: Not checked in for 30+ days
 * - Critical: Age >= 3 years (Batten replacement policy)
 * - Warning: Age >= 2 years (approaching replacement)
 * - Good: Age < 2 years and active
 */
function determineDeviceStatusWithReasons(
  ageInYears: number,
  daysSinceUpdate: number,
  osVersion: string,
  model: string
): { status: DeviceStatus; statusReason: string; statusReasons: string[]; activityStatus: ActivityStatus } {
  const reasons: string[] = []
  let status: DeviceStatus = 'good'

  // Determine activity status first (30 days = inactive per Batten policy)
  const activityStatus: ActivityStatus = daysSinceUpdate > 30 ? 'inactive' : 'active'

  // Check for inactive devices (not checked in for 30+ days)
  if (daysSinceUpdate > 30) {
    status = 'inactive'
    reasons.push(`Device has not checked in for ${daysSinceUpdate} days (inactive threshold: 30 days)`)
    reasons.push('Device may be lost, stolen, decommissioned, or user has left organization')
  } else {
    // Check critical factors (active devices only)

    // Age >= 3 years = CRITICAL (Batten replacement policy)
    if (ageInYears >= 3) {
      status = 'critical'
      reasons.push(`Device is ${ageInYears.toFixed(1)} years old (exceeds 3-year replacement policy)`)
      reasons.push('Eligible for immediate replacement under Batten IT policy')
    }

    // Unsupported OS = CRITICAL
    if (osVersion.includes('10.')) {
      status = 'critical'
      reasons.push('Running macOS 10.x which is no longer supported by Apple')
    }

    // Check warning factors (only if not already critical)
    if (status !== 'critical') {
      // Age 2-3 years = WARNING (approaching replacement)
      if (ageInYears >= 2) {
        status = 'warning'
        reasons.push(`Device is ${ageInYears.toFixed(1)} years old (approaching 3-year replacement cycle)`)
        reasons.push('Should be budgeted for replacement in next fiscal year')
      }

      // Aging OS = WARNING
      if (osVersion.includes('11.') || osVersion.includes('12.')) {
        status = 'warning'
        reasons.push(`Running macOS ${osVersion} which should be upgraded to latest version`)
      }

      // Old Intel Macs = WARNING
      if (model.includes('Intel') && !model.includes('M1') && !model.includes('M2') && !model.includes('M3') && !model.includes('M4')) {
        if (model.includes('2017') || model.includes('2018') || model.includes('2019') || model.includes('2020')) {
          status = 'warning'
          reasons.push('Intel-based Mac (Apple Silicon offers better performance and efficiency)')
        }
      }
    }

    // If still good, add positive reasons
    if (status === 'good') {
      reasons.push(`Device is ${ageInYears.toFixed(1)} years old (within 3-year lifecycle)`)
      reasons.push(`Device checked in ${daysSinceUpdate} days ago (active and current)`)
      if (model.includes('M1') || model.includes('M2') || model.includes('M3') || model.includes('M4')) {
        reasons.push('Running Apple Silicon (modern, efficient hardware)')
      }
    }
  }

  // Create summary reason
  const statusReason = reasons.length > 0
    ? reasons.join('; ')
    : 'Status could not be determined from available data'

  return { status, statusReason, statusReasons: reasons, activityStatus }
}

/**
 * Determine if a device should be replaced (Batten 3-year policy)
 * Devices older than 5 years are excluded as they are likely retired machines still in use
 */
function shouldReplace(ageInYears: number, osVersion: string, model: string): boolean {
  // Exclude devices older than 5 years (likely retired machines still in use)
  if (ageInYears > 5) return false

  // Replace if 3-5 years old (Batten policy)
  if (ageInYears >= 3) return true

  // Replace if running very old OS that can't be updated
  if (osVersion.includes('10.')) return true

  return false
}

/**
 * Get reason for replacement recommendation (Batten 3-year policy)
 * Devices older than 5 years are excluded as they are likely retired machines still in use
 */
function getReplacementReason(ageInYears: number, osVersion: string, model: string): string {
  const reasons: string[] = []

  if (ageInYears >= 3 && ageInYears <= 5) {
    reasons.push(`Device age is ${ageInYears.toFixed(1)} years (exceeds Batten 3-year replacement policy)`)
  }

  if (osVersion.includes('10.')) {
    reasons.push('Running unsupported macOS 10.x')
  } else if (osVersion.includes('11.')) {
    reasons.push('Running outdated macOS 11')
  }

  if (model.includes('Intel') && !model.includes('M1') && !model.includes('M2') && !model.includes('M3') && !model.includes('M4')) {
    reasons.push('Intel-based Mac (consider Apple Silicon for replacement)')
  }

  return reasons.length > 0 ? reasons.join('; ') : 'General aging concerns'
}

/**
 * Merge and deduplicate devices from multiple sources
 */
export function mergeDevices(jamfDevices: Device[], intuneDevices: Device[]): Device[] {
  const allDevices = [...jamfDevices, ...intuneDevices]

  // Sort by status priority (critical first) then by age
  return allDevices.sort((a, b) => {
    const statusPriority = { critical: 0, warning: 1, good: 2, unknown: 3, inactive: 4 }
    const priorityDiff = statusPriority[a.status] - statusPriority[b.status]

    if (priorityDiff !== 0) return priorityDiff

    // Within same status, sort by age (oldest first)
    return b.ageInYears - a.ageInYears
  })
}

/**
 * Merge Qualys asset and vulnerability data with existing devices
 */
export function mergeQualysData(
  devices: Device[],
  qualysAssets: QualysAssetData[],
  qualysVulns: QualysVulnData[]
): Device[] {
  console.log(`🔒 Merging Qualys data: ${qualysAssets.length} assets, ${qualysVulns.length} vulnerabilities`)

  // Create maps for efficient lookups
  const assetMap = new Map<string, QualysAssetData>()
  const vulnMap = new Map<string, QualysVulnData[]>()

  // Index assets by Agent ID
  qualysAssets.forEach(asset => {
    if (asset['Agent ID']) {
      assetMap.set(asset['Agent ID'].toLowerCase(), asset)
    }
  })

  // Group vulnerabilities by QG Host ID (maps to Agent ID)
  qualysVulns.forEach(vuln => {
    const hostId = vuln['QG Host ID']
    if (!hostId) return

    if (!vulnMap.has(hostId)) {
      vulnMap.set(hostId, [])
    }
    vulnMap.get(hostId)!.push(vuln)
  })

  console.log(`📊 Indexed ${assetMap.size} Qualys assets and ${vulnMap.size} hosts with vulnerabilities`)

  // Match devices to Qualys data
  const mergedDevices = devices.map(device => {
    let qualysAsset: QualysAssetData | undefined
    let deviceVulns: QualysVulnData[] = []

    // Try multiple matching strategies

    // Strategy 1: Match by device name to Asset Name or NetBIOS Name (exact match)
    if (!qualysAsset) {
      for (const [agentId, asset] of assetMap.entries()) {
        const assetName = (asset['Asset Name'] || '').toLowerCase()
        const netbiosName = (asset['NetBIOS Name'] || '').toLowerCase()
        const deviceName = device.name.toLowerCase()

        if (assetName && assetName === deviceName) {
          qualysAsset = asset
          console.log(`✓ Matched device "${device.name}" to Qualys asset via Asset Name (exact)`)
          break
        }
        if (netbiosName && netbiosName === deviceName) {
          qualysAsset = asset
          console.log(`✓ Matched device "${device.name}" to Qualys asset via NetBIOS Name (exact)`)
          break
        }
      }
    }

    // Strategy 2: Match by computing ID extracted from device owner/name
    if (!qualysAsset && (device.owner || device.ownerEmail || device.additionalOwner)) {
      // Try to extract computing ID from device's owner information
      let deviceComputingIds: string[] = []

      // Get computing IDs from device name
      deviceComputingIds = extractComputingIdsFromDeviceName(device.name)

      // Also try from owner email
      if (device.ownerEmail) {
        const emailId = device.ownerEmail.split('@')[0].toLowerCase()
        if (emailId.length >= 4 && emailId.length <= 7) {
          deviceComputingIds.push(emailId)
        }
      }

      // Now try to match with Qualys assets by their "Last Logged On User"
      if (deviceComputingIds.length > 0) {
        for (const [agentId, asset] of assetMap.entries()) {
          const lastLoggedOnUser = (asset['Last Logged On User'] || '').toLowerCase()

          // Check if any of the device's computing IDs appear in the Qualys logged on user
          for (const computingId of deviceComputingIds) {
            if (lastLoggedOnUser.includes(computingId)) {
              qualysAsset = asset
              console.log(`✓ Matched device "${device.name}" to Qualys asset via computing ID "${computingId}" in Last Logged On User: "${lastLoggedOnUser}"`)
              break
            }
          }
          if (qualysAsset) break
        }
      }
    }

    // Strategy 3: Match by partial hostname (e.g., "FBS-abc123-2023" matches "FBS-abc123")
    if (!qualysAsset) {
      const deviceName = device.name.toLowerCase()

      for (const [agentId, asset] of assetMap.entries()) {
        const assetName = (asset['Asset Name'] || '').toLowerCase()
        const netbiosName = (asset['NetBIOS Name'] || '').toLowerCase()

        // Try partial matches - check if one contains the other
        if (assetName && (deviceName.includes(assetName) || assetName.includes(deviceName))) {
          qualysAsset = asset
          console.log(`✓ Matched device "${device.name}" to Qualys asset via Asset Name (partial): "${asset['Asset Name']}"`)
          break
        }
        if (netbiosName && (deviceName.includes(netbiosName) || netbiosName.includes(deviceName))) {
          qualysAsset = asset
          console.log(`✓ Matched device "${device.name}" to Qualys asset via NetBIOS Name (partial): "${asset['NetBIOS Name']}"`)
          break
        }
      }
    }

    // Strategy 4: Match by serial number (if available in Qualys data)
    // Note: QualysAssets.csv doesn't have serial number field, but keeping this for future

    // Strategy 5: Match by MAC address
    if (!qualysAsset && device.serialNumber) {
      // This would require MAC address from device data, which we don't have in current CSVs
      // Keeping placeholder for future enhancement
    }

    // If we found an asset, get its vulnerabilities
    if (qualysAsset) {
      const agentId = qualysAsset['Agent ID']
      deviceVulns = vulnMap.get(agentId) || []

      // Parse Qualys data
      const truRiskScore = parseInt(qualysAsset['TruRisk Score']) || undefined
      const criticalityScore = parseInt(qualysAsset['CriticalityScore']) || undefined
      const lastVulnScan = qualysAsset['Last Vuln Scan'] ? (parseDate(qualysAsset['Last Vuln Scan']) || undefined) : undefined

      // Count vulnerabilities by severity
      const criticalVulns = deviceVulns.filter(v => v.Severity === '5')
      const highVulns = deviceVulns.filter(v => v.Severity === '4')
      const allCriticalHigh = deviceVulns.filter(v => v.Severity === '4' || v.Severity === '5')

      // Extract top CVEs (up to 5)
      const topCVEs = allCriticalHigh
        .filter(v => v['CVE ID'])
        .map(v => v['CVE ID'])
        .slice(0, 5)

      // Parse tags
      const qualysTags = qualysAsset.Tags
        ? qualysAsset.Tags.split(',').map(t => t.trim())
        : []

      // Try to extract computing ID from Qualys "Last Logged On User" field
      // This could be something like "BATTENBUS\bh4hb" or "bh4hb" or "Batten\abc3xy"
      let qualysComputingId: string | undefined
      const lastLoggedOnUser = qualysAsset['Last Logged On User'] || ''

      if (lastLoggedOnUser) {
        // Try patterns like "DOMAIN\username" or just "username"
        const patterns = [
          /\\([a-zA-Z0-9]{4,7})$/,  // Match after backslash (e.g., "BATTENBUS\bh4hb")
          /^([a-zA-Z0-9]{4,7})$/,    // Match standalone computing ID
        ]

        for (const pattern of patterns) {
          const match = lastLoggedOnUser.match(pattern)
          if (match) {
            qualysComputingId = match[1].toLowerCase()
            console.log(`🔍 Extracted computing ID "${qualysComputingId}" from Qualys Last Logged On User: "${lastLoggedOnUser}"`)
            break
          }
        }
      }

      // If we found a computing ID from Qualys that's different from current owners, add as note
      let additionalNotes: string | undefined
      if (qualysComputingId &&
          !device.owner?.toLowerCase().includes(qualysComputingId) &&
          !device.ownerEmail?.toLowerCase().includes(qualysComputingId) &&
          !device.additionalOwner?.toLowerCase().includes(qualysComputingId)) {
        additionalNotes = `Qualys last logged on user: ${lastLoggedOnUser}`
        console.log(`ℹ️  Device "${device.name}" - Qualys shows different user: ${lastLoggedOnUser}`)
      }

      console.log(`🔒 Device "${device.name}": ${deviceVulns.length} total vulns (${criticalVulns.length} critical, ${highVulns.length} high), TruRisk: ${truRiskScore}`)

      // Extract IP address from Qualys data
      const ipAddress = qualysAsset['IPV4 Address'] || undefined

      // Convert vulnerability data to Vulnerability objects
      // Sort by severity (highest first), then by TruRisk score
      const vulnerabilities: Vulnerability[] = deviceVulns
        .map(v => ({
          qid: v['QID'] || '',
          title: v['Title'] || 'Unknown Vulnerability',
          severity: parseInt(v['Severity']) || 0,
          cveId: v['CVE ID'] || undefined,
          category: v['Category'] || undefined,
          firstDetected: parseDate(v['First Detected']) || undefined,
          lastDetected: parseDate(v['Last Detected']) || undefined,
          solution: v['Solution'] || undefined,
          threat: v['Threat'] || undefined,
          impact: v['Impact'] || undefined,
          truRiskScore: parseInt(v['TruRisk Score']) || undefined,
        }))
        .sort((a, b) => {
          // Sort by severity first (descending)
          if (b.severity !== a.severity) return b.severity - a.severity
          // Then by TruRisk score (descending)
          return (b.truRiskScore || 0) - (a.truRiskScore || 0)
        })

      // Update device with Qualys data
      return {
        ...device,
        qualysAgentId: agentId,
        qualysHostId: qualysAsset['Host ID'],
        truRiskScore,
        criticalityScore,
        lastVulnScan,
        vulnerabilityCount: deviceVulns.length,
        criticalVulnCount: allCriticalHigh.length,
        highVulnCount: highVulns.length,
        criticalVulnCount5: criticalVulns.length,
        topCVEs,
        qualysTags,
        ipAddress,
        vulnerabilities,
        notes: additionalNotes ? (device.notes ? `${device.notes}; ${additionalNotes}` : additionalNotes) : device.notes,
      }
    }

    return device
  })

  const matchedCount = mergedDevices.filter(d => d.qualysAgentId).length
  console.log(`✅ Matched ${matchedCount} of ${devices.length} devices to Qualys data`)

  return mergedDevices
}

/**
 * Merge Entra device data with existing devices for better user matching
 * Entra data provides direct device-to-user mapping via User principal name
 */
export function mergeEntraData(
  devices: Device[],
  entraDeviceMap: Map<string, EntraDeviceData>,
  usersMap?: Map<string, BattenUserData>
): Device[] {
  console.log(`📋 Merging Entra data for ${devices.length} devices`)

  let matchedCount = 0
  let ownerUpdatedCount = 0
  let additionalOwnerCount = 0

  const mergedDevices = devices.map(device => {
    // Look up device in Entra map by name (uppercase for consistent matching)
    const entraDevice = entraDeviceMap.get(device.name.toUpperCase())

    if (!entraDevice) {
      return device
    }

    matchedCount++

    // Extract user info from Entra
    let userPrincipalName = entraDevice['User principal name']?.trim() || ''
    const entraDepartment = entraDevice['Department']?.trim() || ''
    const entraComplianceState = entraDevice['Compliance state']?.trim() || ''

    // If no user principal name in Entra, try to extract from device name
    if (!userPrincipalName && usersMap) {
      const computingIds = extractComputingIdsFromDeviceName(device.name)
      for (const computingId of computingIds) {
        // Skip if it looks like a provisioner
        if (computingId === 'bh4hb' || computingId === 'jww8je') continue

        const matchedUser = usersMap.get(computingId)
        if (matchedUser) {
          // Found a user from device name - use their email as the principal name
          userPrincipalName = matchedUser.mail || `${computingId}@virginia.edu`
          console.log(`📋 Device "${device.name}": No Entra user, but found ${matchedUser.name} from device name computing ID "${computingId}"`)
          break
        }
      }
    }

    // If still no user principal name, nothing to add
    if (!userPrincipalName) {
      return device
    }

    // Extract computing ID from email (e.g., "jsm2ku@virginia.edu" -> "jsm2ku")
    const entraComputingId = userPrincipalName.split('@')[0].toLowerCase()

    // Check if the Entra user is an IT provisioner (shouldn't be primary owner)
    const isProvisioner = isITProvisioner(userPrincipalName, entraComputingId)

    // Try to look up full name from users directory
    let entraUserName = userPrincipalName
    if (usersMap && entraComputingId) {
      const matchedUser = usersMap.get(entraComputingId)
      if (matchedUser && matchedUser.name) {
        entraUserName = matchedUser.name
      }
    }

    // Determine how to update owner fields
    let newOwner = device.owner
    let newOwnerEmail = device.ownerEmail
    let newAdditionalOwner = device.additionalOwner
    let newDepartment = device.department || entraDepartment

    // Check if current owner is a provisioner
    const currentOwnerIsProvisioner = isITProvisioner(device.owner, device.ownerEmail)

    if (isProvisioner) {
      // Entra user is a provisioner - add as additional owner only if different
      if (!device.additionalOwner && device.owner !== entraUserName) {
        newAdditionalOwner = `${entraUserName} (provisioner)`
        additionalOwnerCount++
        console.log(`📋 Device "${device.name}": Added provisioner ${entraUserName} as additional owner`)
      }
    } else if (currentOwnerIsProvisioner || device.owner === 'Unassigned' || device.owner === 'Unknown' || !device.owner) {
      // Current owner is a provisioner or unassigned - use Entra user as primary owner
      newOwner = entraUserName
      newOwnerEmail = userPrincipalName
      ownerUpdatedCount++

      // Move old owner to additional owner if they were a provisioner
      if (currentOwnerIsProvisioner && device.owner !== 'Unassigned' && device.owner !== 'Unknown') {
        newAdditionalOwner = device.additionalOwner
          ? `${device.additionalOwner}; ${device.owner} (provisioner)`
          : `${device.owner} (provisioner)`
      }

      console.log(`📋 Device "${device.name}": Updated primary owner from "${device.owner}" to "${entraUserName}"`)
    } else if (device.owner !== entraUserName && !device.additionalOwner) {
      // Different user - add Entra user as additional owner
      newAdditionalOwner = entraUserName
      additionalOwnerCount++
      console.log(`📋 Device "${device.name}": Added ${entraUserName} as additional owner (primary: ${device.owner})`)
    }

    // Add compliance state note if non-compliant
    let notes = device.notes || ''
    if (entraComplianceState && entraComplianceState !== 'Compliant' && entraComplianceState !== 'Unknown') {
      const complianceNote = `Entra compliance: ${entraComplianceState}`
      notes = notes ? `${notes}; ${complianceNote}` : complianceNote
    }

    return {
      ...device,
      owner: newOwner,
      ownerEmail: newOwnerEmail,
      additionalOwner: newAdditionalOwner,
      department: newDepartment,
      notes: notes || undefined,
    }
  })

  console.log(`✅ Entra merge complete: ${matchedCount} devices matched`)
  console.log(`   - ${ownerUpdatedCount} primary owners updated`)
  console.log(`   - ${additionalOwnerCount} additional owners added`)

  return mergedDevices
}

/**
 * Transform Axonius data into Device objects
 * Axonius aggregates data from multiple sources (Jamf, Intune, Qualys, AD, etc.)
 */
export function transformAxoniusData(axoniusData: AxoniusDeviceData[], usersMap?: Map<string, BattenUserData>): Device[] {
  console.log(`🔄 Transforming ${axoniusData.length} Axonius records`)

  const devices: Device[] = []
  const now = new Date()

  for (const raw of axoniusData) {
    // Get hostname - use first line if multi-line
    const hostname = (raw['Aggregated: Host Name'] || '').split('\n')[0].trim()

    // Skip if no hostname or not a BA-/FBS- device
    if (!hostname) continue
    const upperHostname = hostname.toUpperCase()
    if (!upperHostname.startsWith('BA-') && !upperHostname.startsWith('FBS-')) {
      continue
    }

    // Parse OS type
    const osTypeRaw = (raw['Aggregated: OS: Type'] || '').split('\n')[0].trim()
    let osType: OSType = 'Unknown'
    if (osTypeRaw === 'OS X' || osTypeRaw === 'macOS') {
      osType = 'macOS'
    } else if (osTypeRaw === 'Windows') {
      osType = 'Windows'
    } else if (osTypeRaw === 'iOS') {
      osType = 'iOS'
    } else if (osTypeRaw === 'Android') {
      osType = 'Android'
    }

    // Parse last seen date
    const lastSeenStr = (raw['Aggregated: Last Seen'] || '').split('\n')[0].trim()
    const lastSeen = parseDate(lastSeenStr) || now

    // Get model - convert cryptic identifiers to friendly names
    const rawModel = (raw['Aggregated: Device Model'] || '').split('\n')[0].trim() || 'Unknown'
    const model = lookupModelName(rawModel)
    const manufacturer = getManufacturerFromModel(rawModel)

    // Calculate age from model release year
    const ageInYears = calculateAgeFromModel(rawModel)
    const releaseYear = getModelReleaseYear(rawModel)
    const purchaseDate = releaseYear > 0 ? new Date(releaseYear, 5, 1) : undefined // Estimate June of release year

    // Get serial number
    const serialNumber = (raw['Aggregated: Bios Serial'] || raw['Aggregated: Device Manufacturer Serial'] || '').split('\n')[0].trim()

    // Parse users - get first non-system, non-provisioner user
    const usersRaw = raw['Aggregated: Last Used Users'] || ''
    const usersList = usersRaw.split('\n').map(u => u.trim()).filter(u => u)
    let owner = 'Unassigned'
    let ownerEmail: string | undefined
    let additionalOwner: string | undefined

    // System accounts to skip
    const systemAccounts = new Set([
      'WDAGUtilityAccount', 'DefaultAccount', 'Administrator', 'Guest', 'Admin', 'SYSTEM',
      'LOCAL SERVICE', 'NETWORK SERVICE', 'root', '_uucp', '_mbsetupuser', 'battenit',
      'BattenIT', 'BattenIT_2025', 'itsjamfmanage', 'itsjamflaps', 'loaner', 'loaner..',
      'removeme', 'fbsadmin', 'panopto_upload', 'Tina'
    ])

    // Helper to extract computing ID from various user formats
    const extractComputingId = (user: string): string | null => {
      // Handle domain format like "ESERVICES\\username"
      if (user.includes('\\')) {
        const parts = user.split('\\')
        const username = parts[parts.length - 1]
        if (/^[a-z]{2,4}[0-9][a-z0-9]*$/i.test(username)) {
          return username.toLowerCase()
        }
        return null
      }
      // Handle email format
      if (user.includes('@')) {
        const computingId = user.split('@')[0].toLowerCase()
        // Filter out non-computing-ID emails (e.g., name.eservices.virginia.edu)
        if (/^[a-z]{2,4}[0-9][a-z0-9]*$/i.test(computingId)) {
          return computingId
        }
        return null
      }
      // Handle plain computing ID
      if (/^[a-z]{2,4}[0-9][a-z0-9]*$/i.test(user)) {
        return user.toLowerCase()
      }
      return null
    }

    // Helper to get user info from computing ID
    const getUserInfo = (computingId: string): { name: string; email: string } => {
      const email = `${computingId}@virginia.edu`
      if (usersMap) {
        const matchedUser = usersMap.get(computingId)
        if (matchedUser && matchedUser.name) {
          return { name: matchedUser.name, email }
        }
      }
      return { name: computingId, email }
    }

    // Collect all valid users (non-system accounts) with their computing IDs
    const validUsers: { raw: string; computingId: string | null; isProvisioner: boolean }[] = []

    for (const user of usersList) {
      // Skip system accounts
      if (systemAccounts.has(user)) continue

      // Skip users ending with ".." (partial names like "loaner..", "name..")
      if (user.endsWith('..')) continue

      // Skip domain-qualified names that aren't computing IDs (e.g., "name.eservices.virginia.edu")
      if (user.includes('.eservices.virginia.edu')) continue

      const computingId = extractComputingId(user)
      const testEmail = computingId ? `${computingId}@virginia.edu` : user
      const isProvisioner = isITProvisioner(user, testEmail) || (computingId && isITProvisioner(computingId, testEmail))

      validUsers.push({ raw: user, computingId, isProvisioner })
    }

    // Find first non-provisioner user
    const primaryUser = validUsers.find(u => !u.isProvisioner && u.computingId)
    const provisionerUser = validUsers.find(u => u.isProvisioner && u.computingId)

    if (primaryUser && primaryUser.computingId) {
      // We found a real user
      const userInfo = getUserInfo(primaryUser.computingId)
      owner = userInfo.name
      ownerEmail = userInfo.email

      // If there was also a provisioner, add them as additional owner
      if (provisionerUser && provisionerUser.computingId) {
        const provInfo = getUserInfo(provisionerUser.computingId)
        additionalOwner = `${provInfo.name} (IT Provisioner)`
      }
    } else if (provisionerUser && provisionerUser.computingId) {
      // Only found provisioner - they're the owner but flag it
      const userInfo = getUserInfo(provisionerUser.computingId)
      owner = userInfo.name
      ownerEmail = userInfo.email
      // Note: This is a provisioner-only device, might be a loaner or shared device
    } else {
      // No valid users found, try to get owner from device name
      const computingIds = extractComputingIdsFromDeviceName(hostname)
      for (const computingId of computingIds) {
        if (!isITProvisioner(computingId, `${computingId}@virginia.edu`)) {
          const userInfo = getUserInfo(computingId)
          owner = userInfo.name
          ownerEmail = userInfo.email
          break
        }
      }
    }

    // Get user description (Faculty/Staff)
    const userDescRaw = raw['Aggregated: Last Used Users Description'] || ''
    const userDescList = userDescRaw.split('\n').map(d => d.trim()).filter(d => d && d !== 'None')
    const department = userDescList[0] || undefined

    // Get IP addresses (first IPv4)
    const ipsRaw = raw['Aggregated: Network Interfaces: IPs'] || ''
    const ipsList = ipsRaw.split('\n').map(ip => ip.trim()).filter(ip => ip)
    const ipv4s = ipsList.filter(ip => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip) && !ip.startsWith('127.'))
    const ipAddress = ipv4s[0] || undefined

    // Parse vulnerabilities from Axonius Qualys data
    const vulnCVEs = (raw['Aggregated: Qualys Vulnerabilities: EPSS Data: CVE ID'] || '').split('\n').filter(c => c.trim())
    const vulnSeverities = (raw['Aggregated: Qualys Vulnerabilities: EPSS Data: Severity'] || '').split('\n').filter(s => s.trim())
    const vulnScores = (raw['Aggregated: Qualys Vulnerabilities: EPSS Data: Score'] || '').split('\n').filter(s => s.trim())

    const vulnerabilities: Vulnerability[] = []
    for (let i = 0; i < vulnCVEs.length && i < 20; i++) {
      const cveId = vulnCVEs[i]?.trim()
      if (!cveId) continue

      vulnerabilities.push({
        qid: '',
        title: cveId,
        severity: parseInt(vulnSeverities[i]) || 0,
        cveId: cveId,
        truRiskScore: parseFloat(vulnScores[i]) || undefined,
      })
    }

    // Sort vulnerabilities by severity
    vulnerabilities.sort((a, b) => b.severity - a.severity)

    // Determine activity status
    const daysSinceLastSeen = daysBetween(lastSeen, now)
    const activityStatus = daysSinceLastSeen <= 180 ? 'active' : 'inactive'

    // Determine device status based on age, activity, and vulnerabilities
    let status: DeviceStatus = 'unknown'
    let statusReasons: string[] = []

    if (activityStatus === 'inactive') {
      status = 'inactive'
      statusReasons.push(`Not seen for ${daysSinceLastSeen} days`)
    } else {
      // Check age-based status (Batten 3-year policy)
      if (ageInYears >= 3) {
        status = 'critical'
        statusReasons.push(`Device is ${ageInYears.toFixed(1)} years old (exceeds 3-year replacement policy)`)
      } else if (ageInYears >= 2) {
        status = 'warning'
        statusReasons.push(`Device is ${ageInYears.toFixed(1)} years old (approaching 3-year replacement cycle)`)
      }

      // Check vulnerability status (can escalate status)
      if (vulnerabilities.some(v => v.severity >= 5)) {
        if (status !== 'critical') {
          status = 'critical'
        }
        statusReasons.push('Has critical (severity 5) vulnerabilities')
      } else if (vulnerabilities.some(v => v.severity >= 4)) {
        if (status !== 'critical' && status !== 'warning') {
          status = 'warning'
        }
        statusReasons.push('Has high (severity 4) vulnerabilities')
      }

      // If still unknown or no issues, mark as good
      if (status === 'unknown') {
        status = 'good'
        if (ageInYears > 0) {
          statusReasons.push(`Device is ${ageInYears.toFixed(1)} years old (within 3-year lifecycle)`)
        }
        statusReasons.push('Active with no critical vulnerabilities')
      }
    }

    // Determine replacement recommendation based on age
    const replacementRecommended = ageInYears >= 3 && ageInYears <= 5
    const replacementReason = replacementRecommended
      ? `Device age is ${ageInYears.toFixed(1)} years (exceeds Batten 3-year replacement policy)`
      : undefined

    // Get data sources
    const adapterConnections = (raw['Aggregated: Adapter Connections'] || '').split('\n').map(a => a.trim()).filter(a => a)
    const sourceNote = `Data sources: ${adapterConnections.slice(0, 5).join(', ')}${adapterConnections.length > 5 ? ` +${adapterConnections.length - 5} more` : ''}`

    const device: Device = {
      id: `axonius-${hostname}`,
      name: hostname,
      owner,
      ownerEmail,
      additionalOwner,
      department,
      osType,
      osVersion: '', // Axonius export doesn't have OS version in this export
      manufacturer,
      model,
      serialNumber: serialNumber || undefined,
      purchaseDate,
      lastSeen,
      ageInYears,
      status,
      activityStatus,
      source: adapterConnections.includes('jamf_adapter') ? 'jamf' : adapterConnections.includes('intune_adapter') ? 'intune' : 'qualys',
      ipAddress,
      vulnerabilityCount: vulnerabilities.length,
      criticalVulnCount: vulnerabilities.filter(v => v.severity >= 4).length,
      criticalVulnCount5: vulnerabilities.filter(v => v.severity >= 5).length,
      highVulnCount: vulnerabilities.filter(v => v.severity === 4).length,
      vulnerabilities: vulnerabilities.length > 0 ? vulnerabilities : undefined,
      replacementRecommended,
      replacementReason,
      statusReasons,
      notes: sourceNote,
    }

    devices.push(device)
  }

  console.log(`✅ Transformed ${devices.length} BA/FBS devices from Axonius`)
  return devices
}
