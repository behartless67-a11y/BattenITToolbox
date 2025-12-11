/**
 * CSV Parser Utilities
 * Handles parsing of Intune and Jamf CSV exports
 */

export interface IntuneRawData {
  DeviceName: string
  UPN: string
  ReportStatus: string
  ReportStatus_loc: string
  AssignmentFilterIds: string
  PspdpuLastModifiedTimeUtc: string
}

export interface JamfRawData {
  'Computer Name': string
  'Processor Type': string
  'Warranty Expiration': string
  Supervised: string
  'Serial Number': string
  'Last Check-in': string
  'Full Name': string
  'User Approved MDM': string
  Department: string
  'Last Enrollment': string
  'MAC Address': string
  Model: string
  Username: string
  'Operating System Version': string
  'Last Inventory Update': string
  Managed: string
  'Email Address': string
  Make: string
}

export interface BattenUserData {
  uid: string
  mail: string
  uvaPersonUniversityID: string
  name: string
  uvRestrict: string
  success: string
  errorMessage: string
}

export interface QualysAssetData {
  'Asset ID': string
  'Host ID': string
  'Agent ID': string
  'Asset Name': string
  'NetBIOS Name': string
  'MAC Address': string
  'IPV4 Address': string
  'IPV6 Address': string
  'Operating System': string
  'Operating System Category': string
  'Operating System Version': string
  'Hardware Category': string
  'Hardware': string
  'CPU Count': string
  'CPU Speed (MHz)': string
  'CPU Description': string
  'Total Memory (MB)': string
  'BIOS Description': string
  'BIOS Serial Number': string
  'BIOS Asset Tag': string
  'Timezone': string
  'TruRisk Score': string
  'CriticalityScore': string
  'Tags': string
  'Modules': string
  'Last System Boot': string
  'Last Logged On User': string
  'Inventory Source': string
  'Inventory Created On': string
  'Inventory Last Updated On': string
  'Architecture': string
  'Last Vuln Scan'?: string
}

export interface QualysVulnData {
  'IP': string
  'DNS': string
  'NetBIOS': string
  'QG Host ID': string
  'IP Interfaces': string
  'Tracking Method': string
  'OS': string
  'IP Status': string
  'QID': string
  'Title': string
  'Vuln Status': string
  'Type': string
  'Severity': string
  'Port': string
  'Protocol': string
  'FQDN': string
  'SSL': string
  'First Detected': string
  'Last Detected': string
  'Times Detected': string
  'Date Last Fixed': string
  'CVE ID': string
  'Vendor Reference': string
  'Bugtraq ID': string
  'Threat': string
  'Impact': string
  'Solution': string
  'Exploitability': string
  'Associated Malware': string
  'Results': string
  'PCI Vuln': string
  'Ticket State': string
  'Instance': string
  'Category': string
  'Associated Tags': string
  'Associated AGs': string
  'QDS': string
  'ARS': string
  'ACS': string
  'TruRisk Score': string
}

export interface EntraDeviceData {
  'Display name': string
  'Device OS type': string
  'Device OS version': string
  'User principal name': string
  'Department': string
  'Approximate last logon timestamp': string
  'Device enrollment type': string
  'Compliance state': string
  'Enrolled datetime': string
  'Last contacted date time': string
  'Manufacturer': string
  'Model': string
  'Management agent': string
}

export interface AxoniusDeviceData {
  'Aggregated: Adapter Connections': string
  'Aggregated: Asset Name': string
  'Aggregated: Host Name': string
  'Aggregated: Last Used Users': string
  'Aggregated: Last Used Users Description': string
  'Aggregated: Last Seen': string
  'Aggregated: Network Interfaces: MAC': string
  'Aggregated: Network Interfaces: IPs': string
  'Aggregated: OS: Type': string
  'Aggregated: Tags': string
  'Aggregated: Device Model': string
  'Aggregated: Qualys Vulnerabilities: EPSS Data: CVE ID': string
  'Aggregated: Qualys Vulnerabilities: EPSS Data: Score': string
  'Aggregated: Qualys Vulnerabilities: EPSS Data: Percentile': string
  'Aggregated: Qualys Vulnerabilities: EPSS Data: Last Calculation Date': string
  'Aggregated: Qualys Vulnerabilities: EPSS Data: Severity': string
  'Aggregated: Qualys Vulnerabilities: EPSS Data: Probability': string
  'Aggregated: Bios Serial': string
  'Aggregated: Device Manufacturer Serial': string
}

/**
 * Parse CSV string into array of objects
 */
export function parseCSV<T>(csvContent: string): T[] {
  const lines = csvContent.trim().split('\n')
  if (lines.length < 2) return []

  // Parse header
  const headers = parseCSVLine(lines[0])

  // Parse rows
  const data: T[] = []
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue // Skip empty lines

    const values = parseCSVLine(lines[i])
    const row: any = {}

    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })

    data.push(row as T)
  }

  return data
}

/**
 * Parse CSV with multi-line values (like Axonius exports)
 * This handles newlines inside quoted fields
 */
export function parseCSVMultiline<T>(csvContent: string): T[] {
  const data: T[] = []
  let headers: string[] = []

  // Remove BOM if present
  if (csvContent.charCodeAt(0) === 0xFEFF) {
    csvContent = csvContent.substring(1)
  }

  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false
  let isFirstRow = true

  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i]
    const nextChar = csvContent[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentField += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // Field delimiter
      currentRow.push(currentField.trim())
      currentField = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // Row delimiter (only when not in quotes)
      if (char === '\r' && nextChar === '\n') {
        i++ // Skip \n in \r\n
      }

      // Finish current field
      currentRow.push(currentField.trim())
      currentField = ''

      if (currentRow.length > 0 && currentRow.some(f => f !== '')) {
        if (isFirstRow) {
          headers = currentRow
          isFirstRow = false
        } else {
          const row: any = {}
          headers.forEach((header, index) => {
            row[header] = currentRow[index] || ''
          })
          data.push(row as T)
        }
      }

      currentRow = []
    } else {
      currentField += char
    }
  }

  // Handle last row if not empty
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim())
    if (currentRow.length > 0 && currentRow.some(f => f !== '')) {
      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = currentRow[index] || ''
      })
      data.push(row as T)
    }
  }

  return data
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // Field delimiter
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  // Add last field
  result.push(current.trim())

  // Remove BOM if present
  if (result[0] && result[0].charCodeAt(0) === 0xFEFF) {
    result[0] = result[0].substring(1)
  }

  return result
}

/**
 * Read and parse CSV file from File object
 */
export async function readCSVFile<T>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = parseCSV<T>(content)
        resolve(data)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

/**
 * Parse date string, handling various formats
 */
export function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '' || dateStr === '1970-01-01 00:00:00') {
    return null
  }

  const date = new Date(dateStr)
  if (isNaN(date.getTime())) {
    return null
  }

  // Ignore dates that are clearly invalid (epoch or far future)
  if (date.getFullYear() < 2000 || date.getFullYear() > 2030) {
    return null
  }

  return date
}

/**
 * Calculate days between two dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  const diff = Math.abs(date2.getTime() - date1.getTime())
  return Math.floor(diff / msPerDay)
}

/**
 * Calculate years between two dates
 */
export function yearsBetween(date1: Date, date2: Date): number {
  const days = daysBetween(date1, date2)
  return days / 365.25
}
