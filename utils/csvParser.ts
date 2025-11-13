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
