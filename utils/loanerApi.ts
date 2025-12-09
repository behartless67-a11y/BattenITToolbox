/**
 * Loaner Laptops API
 * Handles syncing loaner laptops with Azure backend
 */

import { LoanerLaptop, LoanHistory } from '../types/loaner';

const API_BASE = '/api/loaners';

export interface LoanerData {
  loaners: LoanerLaptop[];
  loanHistory: LoanHistory[];
}

/**
 * Fetch all loaners and history from the API
 */
export async function fetchLoaners(): Promise<LoanerData> {
  try {
    const response = await fetch(API_BASE);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    // Parse dates
    const loaners = data.loaners.map((loaner: LoanerLaptop) => ({
      ...loaner,
      checkoutDate: loaner.checkoutDate ? new Date(loaner.checkoutDate) : undefined,
      expectedReturnDate: loaner.expectedReturnDate ? new Date(loaner.expectedReturnDate) : undefined,
      actualReturnDate: loaner.actualReturnDate ? new Date(loaner.actualReturnDate) : undefined,
      createdAt: new Date(loaner.createdAt),
      updatedAt: new Date(loaner.updatedAt),
    }));

    const loanHistory = data.loanHistory.map((entry: LoanHistory) => ({
      ...entry,
      checkoutDate: new Date(entry.checkoutDate),
      expectedReturnDate: entry.expectedReturnDate ? new Date(entry.expectedReturnDate) : undefined,
      actualReturnDate: entry.actualReturnDate ? new Date(entry.actualReturnDate) : undefined,
    }));

    return { loaners, loanHistory };
  } catch (error) {
    console.error('Error fetching loaners:', error);
    // Fall back to localStorage if API fails
    return getLocalLoaners();
  }
}

/**
 * Create a new loaner laptop
 */
export async function createLoaner(loaner: LoanerLaptop): Promise<LoanerLaptop> {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loaner)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Also save to localStorage as backup
    saveLocalLoaner(loaner);
    return loaner;
  } catch (error) {
    console.error('Error creating loaner:', error);
    // Fall back to localStorage
    saveLocalLoaner(loaner);
    return loaner;
  }
}

/**
 * Update an existing loaner laptop
 */
export async function updateLoaner(loaner: LoanerLaptop): Promise<LoanerLaptop> {
  try {
    const response = await fetch(`${API_BASE}/${loaner.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loaner)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Also save to localStorage as backup
    saveLocalLoaner(loaner);
    return loaner;
  } catch (error) {
    console.error('Error updating loaner:', error);
    // Fall back to localStorage
    saveLocalLoaner(loaner);
    return loaner;
  }
}

/**
 * Delete a loaner laptop
 */
export async function deleteLoaner(id: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Also delete from localStorage
    deleteLocalLoaner(id);
  } catch (error) {
    console.error('Error deleting loaner:', error);
    // Fall back to localStorage
    deleteLocalLoaner(id);
  }
}

/**
 * Add a loan history entry
 */
export async function addLoanHistoryEntry(entry: LoanHistory): Promise<LoanHistory> {
  try {
    const response = await fetch(`${API_BASE}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Also save to localStorage as backup
    saveLocalHistoryEntry(entry);
    return entry;
  } catch (error) {
    console.error('Error adding loan history:', error);
    // Fall back to localStorage
    saveLocalHistoryEntry(entry);
    return entry;
  }
}

/**
 * Update a loan history entry (for recording returns)
 */
export async function updateLoanHistoryEntry(id: string, updates: Partial<LoanHistory>): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Also update localStorage
    updateLocalHistoryEntry(id, updates);
  } catch (error) {
    console.error('Error updating loan history:', error);
    // Fall back to localStorage
    updateLocalHistoryEntry(id, updates);
  }
}

// ============ localStorage fallback functions ============

function getLocalLoaners(): LoanerData {
  try {
    const storedLoaners = localStorage.getItem('batten-loaners');
    const storedHistory = localStorage.getItem('batten-loan-history');

    const loaners = storedLoaners ? JSON.parse(storedLoaners).map((loaner: LoanerLaptop) => ({
      ...loaner,
      checkoutDate: loaner.checkoutDate ? new Date(loaner.checkoutDate) : undefined,
      expectedReturnDate: loaner.expectedReturnDate ? new Date(loaner.expectedReturnDate) : undefined,
      actualReturnDate: loaner.actualReturnDate ? new Date(loaner.actualReturnDate) : undefined,
      createdAt: new Date(loaner.createdAt),
      updatedAt: new Date(loaner.updatedAt),
    })) : [];

    const loanHistory = storedHistory ? JSON.parse(storedHistory).map((entry: LoanHistory) => ({
      ...entry,
      checkoutDate: new Date(entry.checkoutDate),
      expectedReturnDate: entry.expectedReturnDate ? new Date(entry.expectedReturnDate) : undefined,
      actualReturnDate: entry.actualReturnDate ? new Date(entry.actualReturnDate) : undefined,
    })) : [];

    return { loaners, loanHistory };
  } catch {
    return { loaners: [], loanHistory: [] };
  }
}

function saveLocalLoaner(loaner: LoanerLaptop): void {
  try {
    const { loaners } = getLocalLoaners();
    const existingIndex = loaners.findIndex(l => l.id === loaner.id);

    if (existingIndex >= 0) {
      loaners[existingIndex] = loaner;
    } else {
      loaners.push(loaner);
    }

    localStorage.setItem('batten-loaners', JSON.stringify(loaners));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

function deleteLocalLoaner(id: string): void {
  try {
    const { loaners, loanHistory } = getLocalLoaners();
    const filteredLoaners = loaners.filter(l => l.id !== id);
    const filteredHistory = loanHistory.filter(h => h.loanerId !== id);

    localStorage.setItem('batten-loaners', JSON.stringify(filteredLoaners));
    localStorage.setItem('batten-loan-history', JSON.stringify(filteredHistory));
  } catch (error) {
    console.error('Error deleting from localStorage:', error);
  }
}

function saveLocalHistoryEntry(entry: LoanHistory): void {
  try {
    const { loanHistory } = getLocalLoaners();
    loanHistory.push(entry);
    localStorage.setItem('batten-loan-history', JSON.stringify(loanHistory));
  } catch (error) {
    console.error('Error saving history to localStorage:', error);
  }
}

function updateLocalHistoryEntry(id: string, updates: Partial<LoanHistory>): void {
  try {
    const { loanHistory } = getLocalLoaners();
    const index = loanHistory.findIndex(h => h.id === id);

    if (index >= 0) {
      loanHistory[index] = { ...loanHistory[index], ...updates };
      localStorage.setItem('batten-loan-history', JSON.stringify(loanHistory));
    }
  } catch (error) {
    console.error('Error updating history in localStorage:', error);
  }
}

/**
 * Sync local loaners to the API (for migration)
 */
export async function syncLocalToApi(): Promise<boolean> {
  try {
    const localData = getLocalLoaners();

    // Only sync if there's local data
    if (localData.loaners.length === 0 && localData.loanHistory.length === 0) {
      return true;
    }

    // Sync each loaner
    for (const loaner of localData.loaners) {
      await createLoaner(loaner);
    }

    // Sync each history entry
    for (const entry of localData.loanHistory) {
      await addLoanHistoryEntry(entry);
    }

    return true;
  } catch (error) {
    console.error('Error syncing to API:', error);
    return false;
  }
}
