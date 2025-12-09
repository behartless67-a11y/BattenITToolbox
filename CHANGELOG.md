# Batten School IT Dashboard

## Overview
A comprehensive IT asset management dashboard for tracking devices, loaner laptops, inventory, and security compliance. Built with Next.js and deployed on Azure Static Web Apps with Azure AD authentication.

---

## Features

### Device Management

#### Device Tracking & Visibility
- **Real-time device inventory** from Jamf Pro and Microsoft Intune
- **Unified view** of macOS (Jamf) and Windows (Intune) devices
- **Device status indicators**: Critical, Warning, Good, Inactive
- **Age tracking** with replacement recommendations for devices 5+ years old
- **Search** across device name, owner, model, and serial number

#### Device Filters
| Filter | Description |
|--------|-------------|
| All Devices | All active (non-retired) devices |
| Critical | Devices with severe compliance or security issues |
| Warning | Devices needing attention |
| Good | Fully compliant devices |
| Inactive | Devices not seen recently |
| Jamf Only | macOS devices managed by Jamf |
| Intune Only | Windows devices managed by Intune |
| Needs Replacement | Devices 5+ years old |
| Retired | Archived devices (excluded from counts) |
| Missing Qualys | Devices without security agent installed |

#### Device Detail Modal
Click any device to see comprehensive details:
- **Owner Information**: Primary owner, email, additional owners, department
- **Hardware Details**: Model, serial, processor, RAM, storage
- **Security Status**: Qualys agent status, vulnerability count, last scan
- **Management Info**: Jamf/Intune enrollment, last check-in, OS version
- **Notes**: Add custom notes about the device
- **Change History**: View audit trail of all changes

#### Device Actions
- **Retire/Restore**: Archive devices no longer in use (excluded from counts)
- **Edit Notes**: Add custom notes for tracking issues or information
- **Edit Owner**: Reassign device ownership (for unassigned devices)
- **Export to CSV**: Download filtered device lists

---

### Loaner Laptop Management

#### Loaner Tracking
- **Add loaner laptops** with asset tag, name, model, serial number
- **Track status**: Available, Checked Out, In Maintenance, Retired
- **Checkout workflow**: Record borrower name, email, department, expected return date
- **Return workflow**: Record actual return date and condition notes
- **Overdue tracking**: Highlight loaners past expected return date

#### Loaner Features
- **Multi-user sync**: All users see the same loaner data (stored in Azure)
- **Loan history**: Complete checkout/return history per device
- **Summary dashboard**: Available, checked out, maintenance counts
- **Search and filter**: Find loaners by name, asset tag, or borrower

---

### Inventory Management

#### Inventory Tracking
- **Track expensive equipment**: Monitors, docks, accessories, etc.
- **Categories**: Monitor, Docking Station, Peripheral, Cable/Adapter, Storage, Networking, Audio/Video, Other
- **Status tracking**: In Stock, Deployed, In Repair, Retired, Lost
- **Purchase info**: Price, date, vendor, warranty expiration
- **Location tracking**: Where items are stored or deployed

#### Inventory Features
- **Add/Edit items**: Full CRUD operations
- **Warranty alerts**: Items with warranty expiring within 90 days
- **Value tracking**: Total inventory value calculation
- **Search**: Find items by name, asset tag, serial, or location

---

### Security & Compliance

#### Security Tab
- **Vulnerability overview**: Devices with security vulnerabilities
- **Missing Qualys agents**: Devices without security monitoring
- **Severity breakdown**: Critical, High, Medium, Low vulnerabilities
- **Compliance status**: Quick view of security posture

#### Qualys Integration
- **Agent status**: Shows if Qualys agent is installed
- **Last scan date**: When device was last scanned
- **Vulnerability count**: Number of detected vulnerabilities
- **Vulnerability details**: List of CVEs with severity levels

---

### Analytics Dashboard (/analytics)

#### Charts & Visualizations
- **Device Age Distribution**: Histogram of device ages
- **OS Distribution**: Pie chart of operating systems
- **Platform Split**: macOS vs Windows breakdown
- **Compliance Trends**: Status over time
- **Manufacturer Distribution**: Device brands
- **Replacement Forecast**: Budget planning for replacements

---

### User Lookup Tool

#### Find User's Devices
- Enter computing ID or name
- See all devices assigned to that user
- Quick way to help users find their devices

---

### Data Management

#### CSV Import
- **Upload device data** from Jamf and Intune exports
- **Automatic parsing** and data normalization
- **Merge data** from multiple sources

#### Data Export
- **Export device lists** to CSV
- **Filtered exports**: Export only the devices you're viewing
- **Custom columns**: Device name, owner, model, age, status, etc.

---

### Audit Logging

#### Change Tracking
All changes are logged with:
- **Timestamp**: When the change was made
- **User**: Who made the change (from Azure AD)
- **Action**: What was done (retire, update, create, delete)
- **Field**: Which field changed
- **Before/After**: Old and new values

#### Audited Actions
- Device retire/restore
- Device notes changes
- Device owner changes
- Loaner create/edit/delete
- Loaner checkout/return

#### View History
- Click "Change History" in any device modal
- Shows all recorded changes for that device

---

### Authentication & Security

#### Azure AD Integration
- **Single Sign-On**: Login with UVA credentials
- **Role-based access**: Only authenticated users can access
- **User identification**: All actions tracked to user account

---

## Technical Architecture

### Frontend
- **Next.js 15** with React
- **Tailwind CSS** for styling
- **Static export** for Azure Static Web Apps

### Backend (Azure Functions)
| Endpoint | Purpose |
|----------|---------|
| `/api/device-settings` | Retired devices, notes, owner overrides |
| `/api/loaners` | Loaner laptop CRUD operations |
| `/api/audit-log` | Change history tracking |

### Data Storage
- **Azure Table Storage**: Shared data (settings, loaners, audit logs)
- **localStorage**: Fallback when offline, CSV data cache
- **CSV Files**: Source data from Jamf/Intune exports

---

## Recent Updates (2025-12-09)

### New Features
1. **Loaner Laptop Sync** - Multi-user support via Azure API
2. **Audit Logging** - Track who changed what
3. **Device Owner Editing** - Reassign device ownership
4. **Missing Qualys Filter** - Find devices without security agent

### Bug Fixes
- Fixed loaner laptops not syncing between users

---

## Deployment

### Azure Static Web Apps
- Auto-deploys from GitHub on push to main
- Azure Functions included for API endpoints
- Azure AD authentication configured

### Required Azure Resources
1. **Static Web App** - Hosts the frontend
2. **Storage Account** - Table Storage for data
3. **Azure AD App Registration** - Authentication

### Environment Variables
```
AZURE_STORAGE_CONNECTION_STRING=<connection string>
```

---

## Future Enhancements (Planned)

1. **User Autocomplete** - Search staff/faculty when assigning owners
2. **Inventory API Sync** - Multi-user inventory like loaners
3. **Auto-Refresh** - Real-time updates without page refresh
4. **Email Notifications** - Alerts for overdue loaners
5. **Bulk Operations** - Retire/update multiple devices at once
