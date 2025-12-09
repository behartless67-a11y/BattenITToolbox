/**
 * Device Settings API
 * Handles syncing retired devices and notes with Azure backend
 */

const API_BASE = '/api/device-settings';

export interface DeviceSettings {
  retiredDevices: string[];
  deviceNotes: Record<string, string>;
  deviceOwners: Record<string, string>; // Custom owner overrides
}

/**
 * Fetch all device settings from the API
 */
export async function fetchDeviceSettings(): Promise<DeviceSettings> {
  try {
    const response = await fetch(API_BASE);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching device settings:', error);
    // Fall back to localStorage if API fails
    return getLocalSettings();
  }
}

/**
 * Update retired status for a device
 */
export async function updateRetiredStatus(deviceId: string, isRetired: boolean): Promise<string[]> {
  try {
    const response = await fetch(`${API_BASE}/retired`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, isRetired })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // Also update localStorage as backup
    saveLocalRetired(data.retiredDevices);
    return data.retiredDevices;
  } catch (error) {
    console.error('Error updating retired status:', error);
    // Fall back to localStorage
    return updateLocalRetired(deviceId, isRetired);
  }
}

/**
 * Update notes for a device
 */
export async function updateDeviceNotes(deviceId: string, notes: string): Promise<Record<string, string>> {
  try {
    const response = await fetch(`${API_BASE}/notes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, notes })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // Also update localStorage as backup
    saveLocalNotes(data.deviceNotes);
    return data.deviceNotes;
  } catch (error) {
    console.error('Error updating device notes:', error);
    // Fall back to localStorage
    return updateLocalNotes(deviceId, notes);
  }
}

/**
 * Update owner for a device
 */
export async function updateDeviceOwner(deviceId: string, owner: string): Promise<Record<string, string>> {
  try {
    const response = await fetch(`${API_BASE}/owners`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, owner })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // Also update localStorage as backup
    saveLocalOwners(data.deviceOwners);
    return data.deviceOwners;
  } catch (error) {
    console.error('Error updating device owner:', error);
    // Fall back to localStorage
    return updateLocalOwner(deviceId, owner);
  }
}

/**
 * Sync local settings to the API (for migration)
 */
export async function syncLocalToApi(): Promise<boolean> {
  try {
    const localSettings = getLocalSettings();

    // Only sync if there's local data
    if (localSettings.retiredDevices.length === 0 && Object.keys(localSettings.deviceNotes).length === 0) {
      return true;
    }

    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(localSettings)
    });

    return response.ok;
  } catch (error) {
    console.error('Error syncing to API:', error);
    return false;
  }
}

// ============ localStorage fallback functions ============

function getLocalSettings(): DeviceSettings {
  try {
    const retiredStored = localStorage.getItem('batten-retired-devices');
    const notesStored = localStorage.getItem('batten-device-notes');
    const ownersStored = localStorage.getItem('batten-device-owners');

    return {
      retiredDevices: retiredStored ? JSON.parse(retiredStored) : [],
      deviceNotes: notesStored ? JSON.parse(notesStored) : {},
      deviceOwners: ownersStored ? JSON.parse(ownersStored) : {}
    };
  } catch {
    return { retiredDevices: [], deviceNotes: {}, deviceOwners: {} };
  }
}

function saveLocalRetired(retiredDevices: string[]): void {
  try {
    localStorage.setItem('batten-retired-devices', JSON.stringify(retiredDevices));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

function saveLocalNotes(deviceNotes: Record<string, string>): void {
  try {
    localStorage.setItem('batten-device-notes', JSON.stringify(deviceNotes));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

function updateLocalRetired(deviceId: string, isRetired: boolean): string[] {
  const settings = getLocalSettings();
  const retiredSet = new Set(settings.retiredDevices);

  if (isRetired) {
    retiredSet.add(deviceId);
  } else {
    retiredSet.delete(deviceId);
  }

  const retiredDevices = [...retiredSet];
  saveLocalRetired(retiredDevices);
  return retiredDevices;
}

function updateLocalNotes(deviceId: string, notes: string): Record<string, string> {
  const settings = getLocalSettings();

  if (notes && notes.trim()) {
    settings.deviceNotes[deviceId] = notes.trim();
  } else {
    delete settings.deviceNotes[deviceId];
  }

  saveLocalNotes(settings.deviceNotes);
  return settings.deviceNotes;
}

function saveLocalOwners(deviceOwners: Record<string, string>): void {
  try {
    localStorage.setItem('batten-device-owners', JSON.stringify(deviceOwners));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

function updateLocalOwner(deviceId: string, owner: string): Record<string, string> {
  const settings = getLocalSettings();

  if (owner && owner.trim()) {
    settings.deviceOwners[deviceId] = owner.trim();
  } else {
    delete settings.deviceOwners[deviceId];
  }

  saveLocalOwners(settings.deviceOwners);
  return settings.deviceOwners;
}
