export type DeviceStatus = 'critical' | 'warning' | 'good' | 'inactive' | 'unknown';
export type ActivityStatus = 'active' | 'inactive';
export type DeviceSource = 'jamf' | 'intune' | 'qualys' | 'coreview';
export type OSType = 'macOS' | 'Windows' | 'iOS' | 'Android' | 'Unknown';

export interface Device {
  id: string;
  name: string;
  owner: string;
  ownerEmail?: string;
  additionalOwner?: string; // Owner matched from device name (e.g., computing ID in name)
  department?: string;
  osType: OSType;
  osVersion: string;
  manufacturer?: string;
  model: string;
  serialNumber?: string;
  purchaseDate?: Date;
  lastSeen: Date;
  ageInYears: number;
  status: DeviceStatus;
  activityStatus: ActivityStatus;
  source: DeviceSource;

  // Hardware specs
  ram?: number; // in GB
  storage?: number; // in GB
  processor?: string;

  // Compliance & Security
  isCompliant?: boolean;
  vulnerabilityCount?: number;
  criticalVulnCount?: number; // Qualys: Count of severity 4-5 vulnerabilities
  highVulnCount?: number; // Qualys: Severity 4 vulnerabilities
  criticalVulnCount5?: number; // Qualys: Severity 5 vulnerabilities
  missingPatches?: number;
  lastUpdateDate?: Date;
  daysSinceUpdate?: number;

  // Qualys-specific fields
  qualysAgentId?: string; // Qualys Agent ID for matching
  qualysHostId?: string; // Qualys Host ID
  truRiskScore?: number; // Qualys TruRisk score (0-1000)
  criticalityScore?: number; // Asset criticality
  lastVulnScan?: Date; // Last vulnerability scan date
  topCVEs?: string[]; // Top CVE IDs for this device
  qualysTags?: string[]; // Tags from Qualys (e.g., "BA - Frank Batten School")
  ipAddress?: string; // IP address from Qualys

  // Additional metadata
  notes?: string;
  replacementRecommended: boolean;
  replacementReason?: string;
  statusReason?: string; // Detailed explanation of why device has this status
  statusReasons?: string[]; // Array of all factors contributing to status
}

export interface DeviceSummary {
  totalDevices: number;
  criticalCount: number;
  warningCount: number;
  goodCount: number;
  inactiveCount: number;
  unknownCount: number;
  activeDevices: number;
  inactiveDevices: number;
  averageAge: number;
  devicesNeedingReplacement: number;
  outOfDateDevices: number;
  vulnerableDevices: number;
  // Qualys security metrics
  devicesWithQualysData?: number;
  totalVulnerabilities?: number;
  criticalVulnerabilities?: number;
  averageTruRiskScore?: number;
}

export interface DeviceFilter {
  status?: DeviceStatus[];
  osType?: OSType[];
  source?: DeviceSource[];
  minAge?: number;
  maxAge?: number;
  department?: string;
  replacementOnly?: boolean;
  vulnerableOnly?: boolean;
  searchTerm?: string;
}
