export type DeviceStatus = 'critical' | 'warning' | 'good' | 'unknown';
export type DeviceSource = 'jamf' | 'intune' | 'qualys' | 'coreview';
export type OSType = 'macOS' | 'Windows' | 'iOS' | 'Android' | 'Unknown';

export interface Device {
  id: string;
  name: string;
  owner: string;
  ownerEmail?: string;
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
  source: DeviceSource;

  // Hardware specs
  ram?: number; // in GB
  storage?: number; // in GB
  processor?: string;

  // Compliance & Security
  isCompliant?: boolean;
  vulnerabilityCount?: number;
  missingPatches?: number;
  lastUpdateDate?: Date;
  daysSinceUpdate?: number;

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
  unknownCount: number;
  averageAge: number;
  devicesNeedingReplacement: number;
  outOfDateDevices: number;
  vulnerableDevices: number;
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
