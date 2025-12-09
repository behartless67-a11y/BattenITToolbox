# Changelog

## 2025-12-09

### Loaner Laptop Sync (Multi-User Support)
**Problem:** Loaner laptops were stored in localStorage, so when one user added a loaner, others couldn't see it.

**Solution:** Created Azure Functions API for loaners with shared storage.

**Files Added:**
- `api/loaners/function.json` - Azure Function config
- `api/loaners/index.js` - API endpoint for CRUD operations on loaners
- `utils/loanerApi.ts` - Frontend API client with localStorage fallback

**Files Modified:**
- `app/page.tsx` - Updated to use loaner API instead of localStorage only

**How it works:**
- `GET /api/loaners` - Fetch all loaners and loan history
- `POST /api/loaners` - Create new loaner
- `PUT /api/loaners/{id}` - Update loaner
- `DELETE /api/loaners/{id}` - Delete loaner
- Data stored in Azure Table Storage (`loaners` table)
- Falls back to localStorage if API unavailable

---

### Audit Logging System
**Problem:** No way to track who changed what on devices/loaners.

**Solution:** Created comprehensive audit logging system.

**Files Added:**
- `api/audit-log/function.json` - Azure Function config
- `api/audit-log/index.js` - API endpoint for audit entries
- `types/audit.ts` - TypeScript types for audit entries
- `utils/auditApi.ts` - Frontend API client with convenience functions

**Files Modified:**
- `app/page.tsx` - Added audit logging to device and loaner actions
- `components/DeviceDetailModal.tsx` - Added "Change History" collapsible section

**What gets logged:**
- Device retire/unretire actions
- Device notes updates (with before/after values)
- Device owner changes
- Loaner create/update/delete
- Loaner checkout/return actions

**Each audit entry includes:**
- Timestamp
- User who made the change (from Azure AD auth)
- Entity type and ID
- Action performed
- Field changed
- Old and new values

**How to view history:**
1. Click on any device to open the detail modal
2. Scroll to bottom and click "Change History"
3. See all recorded changes with timestamps and users

---

### Device Owner Editing (Partially Complete)
**Problem:** Unassigned devices need a way to manually assign owners.

**Solution:** Added owner editing capability to device modal.

**Files Modified:**
- `api/device-settings/index.js` - Added `deviceOwners` support and `/owners` endpoint
- `utils/deviceSettingsApi.ts` - Added `updateDeviceOwner` function
- `components/DeviceDetailModal.tsx` - Added owner editing UI for unassigned devices

**Status:** Backend complete, UI added. Still pending: user autocomplete from CSV data.

---

### Missing Qualys Filter (Completed Earlier)
- Added "Missing Qualys" filter button in Devices tab
- Added "Missing Qualys Agent" section in Security tab
- Filters devices without `qualysAgentId`

---

## API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/device-settings` | GET | Get all device settings |
| `/api/device-settings/retired` | PUT | Update retired status |
| `/api/device-settings/notes` | PUT | Update device notes |
| `/api/device-settings/owners` | PUT | Update device owner |
| `/api/loaners` | GET | Get all loaners and history |
| `/api/loaners` | POST | Create new loaner |
| `/api/loaners/{id}` | PUT | Update loaner |
| `/api/loaners/{id}` | DELETE | Delete loaner |
| `/api/audit-log` | GET | Get recent audit entries |
| `/api/audit-log` | POST | Add audit entry |
| `/api/audit-log/{type}/{id}` | GET | Get audit history for entity |

---

## Commits Today

1. `33e793f` - Add Azure Functions API for loaner laptop sync
2. `4e628dd` - Add audit logging for device and loaner changes

---

## TODO / Next Steps

1. **User Autocomplete for Owner Assignment**
   - When assigning an owner, allow typing computing ID to search staff/faculty/students
   - Use existing CSV data for autocomplete

2. **Inventory API Sync**
   - Inventory items still use localStorage only
   - Need same treatment as loaners for multi-user support

3. **Auto-Refresh for Real-Time Updates**
   - Currently requires manual page refresh to see others' changes
   - Could add polling every 30-60 seconds
