export interface AuditEntry {
  id: string;
  timestamp: string;
  entityType: 'device' | 'loaner' | 'inventory' | 'general';
  entityId: string;
  entityName?: string;
  action: 'create' | 'update' | 'delete' | 'checkout' | 'return' | 'retire' | 'unretire';
  field?: string;
  oldValue?: string;
  newValue?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  details?: string;
}

export const ACTION_LABELS: Record<string, string> = {
  'create': 'Created',
  'update': 'Updated',
  'delete': 'Deleted',
  'checkout': 'Checked Out',
  'return': 'Returned',
  'retire': 'Retired',
  'unretire': 'Restored',
};

export const FIELD_LABELS: Record<string, string> = {
  'notes': 'Notes',
  'owner': 'Owner',
  'status': 'Status',
  'retired': 'Retired Status',
  'borrowerName': 'Borrower',
  'condition': 'Condition',
  'name': 'Name',
};
