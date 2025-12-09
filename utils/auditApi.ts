/**
 * Audit Log API
 * Tracks changes to devices, loaners, and inventory
 */

import { AuditEntry } from '../types/audit';

const API_BASE = '/api/audit-log';

// Get current user info from Azure Static Web Apps auth
async function getCurrentUser(): Promise<{ userId: string; userName: string; userEmail: string }> {
  try {
    const response = await fetch('/.auth/me');
    if (response.ok) {
      const data = await response.json();
      if (data.clientPrincipal) {
        return {
          userId: data.clientPrincipal.userId || '',
          userName: data.clientPrincipal.userDetails || '',
          userEmail: data.clientPrincipal.userDetails || ''
        };
      }
    }
  } catch (error) {
    console.error('Error getting current user:', error);
  }
  return { userId: '', userName: 'Unknown User', userEmail: '' };
}

/**
 * Log an audit entry
 */
export async function logAudit(entry: Omit<AuditEntry, 'id' | 'timestamp' | 'userId' | 'userName' | 'userEmail'>): Promise<AuditEntry | null> {
  try {
    const user = await getCurrentUser();

    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...entry,
        ...user
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error logging audit entry:', error);
    return null;
  }
}

/**
 * Get audit entries for a specific entity
 */
export async function getAuditHistory(entityType: string, entityId: string, limit = 50): Promise<AuditEntry[]> {
  try {
    const response = await fetch(`${API_BASE}/${entityType}/${entityId}?limit=${limit}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.entries || [];
  } catch (error) {
    console.error('Error fetching audit history:', error);
    return [];
  }
}

/**
 * Get recent audit entries across all entities
 */
export async function getRecentAuditEntries(limit = 100): Promise<AuditEntry[]> {
  try {
    const response = await fetch(`${API_BASE}?limit=${limit}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.entries || [];
  } catch (error) {
    console.error('Error fetching recent audit entries:', error);
    return [];
  }
}

// ============ Convenience functions for common audit actions ============

/**
 * Log a device update
 */
export async function logDeviceUpdate(
  deviceId: string,
  deviceName: string,
  field: string,
  oldValue: string | undefined,
  newValue: string | undefined
): Promise<void> {
  await logAudit({
    entityType: 'device',
    entityId: deviceId,
    entityName: deviceName,
    action: 'update',
    field,
    oldValue: oldValue || '',
    newValue: newValue || ''
  });
}

/**
 * Log a device retire/unretire action
 */
export async function logDeviceRetire(
  deviceId: string,
  deviceName: string,
  isRetired: boolean
): Promise<void> {
  await logAudit({
    entityType: 'device',
    entityId: deviceId,
    entityName: deviceName,
    action: isRetired ? 'retire' : 'unretire',
    field: 'retired',
    oldValue: isRetired ? 'Active' : 'Retired',
    newValue: isRetired ? 'Retired' : 'Active'
  });
}

/**
 * Log a loaner action
 */
export async function logLoanerAction(
  loanerId: string,
  loanerName: string,
  action: 'create' | 'update' | 'delete' | 'checkout' | 'return',
  details?: string,
  field?: string,
  oldValue?: string,
  newValue?: string
): Promise<void> {
  await logAudit({
    entityType: 'loaner',
    entityId: loanerId,
    entityName: loanerName,
    action,
    field,
    oldValue,
    newValue,
    details
  });
}

/**
 * Log an inventory action
 */
export async function logInventoryAction(
  itemId: string,
  itemName: string,
  action: 'create' | 'update' | 'delete',
  field?: string,
  oldValue?: string,
  newValue?: string
): Promise<void> {
  await logAudit({
    entityType: 'inventory',
    entityId: itemId,
    entityName: itemName,
    action,
    field,
    oldValue,
    newValue
  });
}
