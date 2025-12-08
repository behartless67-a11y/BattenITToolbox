# Batten IT Dashboard

A unified IT management dashboard for the Batten School at the University of Virginia. This application provides a single pane of glass for monitoring and managing IT resources across Jamf, Intune, Qualys, and user directories.

**Live URL**: https://yellow-mushroom-0b1ee430f.5.azurestaticapps.net

## Features

### Device Management
- **Unified Device View**: Aggregates Mac devices from Jamf and Windows devices from Intune
- **Health Monitoring**: Tracks device age, compliance status, and replacement needs based on Batten's 3-year policy
- **Status Classification**: Devices categorized as Good, Warning, Critical, or Inactive
- **Owner Matching**: Intelligent matching of devices to users via computing IDs, email, and Entra directory
- **Search & Filter**: Find devices by name, owner, serial number, or model
- **CSV Export**: Export filtered device lists for reporting

### Security Dashboard
- **Qualys Integration**: Vulnerability counts and TruRisk scores per device
- **Critical Alerts**: Highlights severity 4-5 vulnerabilities requiring immediate attention
- **Fleet Security Metrics**: Average TruRisk score, total vulnerabilities, critical counts

### Analytics Page (`/analytics`)
- **Interactive Charts**: Pie charts and bar graphs using Recharts
- **Device Distribution**: OS type, status, age breakdown visualizations
- **Security Overview**: Vulnerability distribution by severity

### Inventory Management
- **Equipment Tracking**: Track expensive equipment (computers, monitors, A/V gear, etc.)
- **Full CRUD Operations**: Add, edit, delete inventory items
- **Category Classification**: 9 categories (Computer, Monitor, Printer, Networking, etc.)
- **Status Tracking**: Active, In Storage, Needs Repair, Retired, On Order
- **Value Tracking**: Purchase price and total inventory value
- **Warranty Alerts**: Track warranty expiration dates
- **localStorage Persistence**: Data persists in browser

### Loaner Laptop Management
- **Device Pool Tracking**: Manage loaner laptop inventory
- **Checkout/Return Workflow**: Track who has what device and when
- **Overdue Alerts**: Automatic detection of overdue returns
- **Status Dashboard**: Available, Checked Out, In Maintenance, Retired counts
- **Borrower Information**: Name, email, department, expected return date

### Authentication
- **Azure AD Integration**: Microsoft account login required
- **Pre-configured Provider**: Works with Azure Static Web Apps built-in auth
- **Future**: UVA-only restriction via custom App Registration

## Technology Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 15.5.6 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3.4 |
| Charts | Recharts 2.x |
| Icons | Lucide React |
| Fonts | Libre Baskerville (serif), Inter (sans-serif) |
| Hosting | Azure Static Web Apps |
| CI/CD | GitHub Actions |
| Auth | Azure AD (pre-configured) |

## Project Structure

```
BattenITToolBox/
├── app/
│   ├── layout.tsx              # Root layout with fonts
│   ├── page.tsx                # Main dashboard (tabs)
│   ├── globals.css             # Global styles
│   └── analytics/
│       └── page.tsx            # Analytics charts page
│
├── components/
│   ├── Header.tsx              # Navigation header
│   ├── Footer.tsx              # Footer with contact info
│   ├── MetricCard.tsx          # Dashboard metric cards
│   ├── StatusBadge.tsx         # Device status badges
│   ├── DeviceTable.tsx         # Sortable device table
│   ├── CSVUploader.tsx         # CSV file upload modal
│   ├── InventoryTable.tsx      # Inventory list table
│   ├── InventoryForm.tsx       # Add/edit inventory modal
│   ├── LoanerTable.tsx         # Loaner laptop table
│   └── LoanerForm.tsx          # Checkout/return modal
│
├── types/
│   ├── device.ts               # Device, Vulnerability types
│   ├── metric.ts               # MetricCard types
│   ├── inventory.ts            # Inventory item types
│   └── loaner.ts               # Loaner laptop types
│
├── utils/
│   ├── csvParser.ts            # CSV parsing utilities
│   ├── dataLoader.ts           # Data loading & storage
│   ├── deviceTransform.ts      # Jamf/Intune/Qualys transforms
│   └── chartData.ts            # Chart data formatting
│
├── staticwebapp.config.json    # Azure SWA auth config
├── next.config.js              # Next.js config (static export)
├── tailwind.config.js          # Tailwind with UVA colors
└── package.json
```

## Data Sources

The dashboard aggregates data from CSV exports:

| Source | Data Type | Key Fields |
|--------|-----------|------------|
| **Jamf Pro** | Mac devices | Name, Serial, Owner, OS Version, Last Check-in |
| **Microsoft Intune** | Windows devices | Device Name, UPN, Last Modified |
| **Qualys Assets** | Security agents | Asset Name, TruRisk Score, Agent ID |
| **Qualys Vulns** | Vulnerabilities | QID, Severity, CVE ID, Title |
| **Entra Devices** | Directory info | Device Name, User Principal Name, Department |
| **Batten Users** | User directory | Computing ID, Name, Email, Department |

### Uploading Data

1. Navigate to **Tools** tab
2. Click **Upload CSV Files**
3. Select and upload CSV exports from each source
4. Data is stored in browser localStorage

## Design System

### Color Palette
- **UVA Navy**: `#232D4B` - Primary brand color
- **UVA Orange**: `#E57200` - Accent color for CTAs
- **Status Colors**:
  - Good: `#22c55e` (green)
  - Warning: `#f59e0b` (amber)
  - Critical: `#ef4444` (red)
  - Inactive: `#6b7280` (gray)

### Typography
- **Headings**: Libre Baskerville (serif)
- **Body/UI**: Inter (sans-serif)

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

### Build for Production

```bash
npm run build
```

Output is in `/out` directory (static export).

## Deployment

The app auto-deploys to Azure Static Web Apps on push to `main`:

1. GitHub Actions workflow triggers on push
2. Next.js builds static export to `/out`
3. Azure SWA deploys the static files
4. Auth config from `staticwebapp.config.json` is applied

### Azure Configuration

- **Resource**: Azure Static Web App
- **Name**: `yellow-mushroom-0b1ee430f`
- **Region**: (auto-selected)
- **Build**: Next.js preset, output to `/out`

## Authentication Setup

### Current (Pre-configured)
Any Microsoft account can sign in. Config in `staticwebapp.config.json`:

```json
{
  "routes": [
    { "route": "/*", "allowedRoles": ["authenticated"] }
  ],
  "responseOverrides": {
    "401": { "redirect": "/.auth/login/aad" }
  }
}
```

### Future (UVA-Only)
To restrict to UVA accounts, create an Azure AD App Registration:

1. Create App Registration in Azure Portal
2. Set redirect URI to `https://<app-url>/.auth/login/aad/callback`
3. Add `AAD_CLIENT_ID` and `AAD_CLIENT_SECRET` to SWA Configuration
4. Update `staticwebapp.config.json` with tenant-specific issuer

## Device Status Logic

### Status Determination (Active Devices)
| Status | Criteria |
|--------|----------|
| **Critical** | Age >= 3 years (replacement policy) OR unsupported OS |
| **Warning** | Age 2-3 years OR aging OS version |
| **Good** | Age < 2 years AND current OS |

### Activity Status
| Status | Criteria |
|--------|----------|
| **Active** | Checked in within 30 days |
| **Inactive** | No check-in for 30+ days |

### Replacement Recommendation
Devices 3-5 years old are flagged for replacement per Batten's 3-year policy. Devices >5 years are excluded (likely already retired/repurposed).

## API Integration (Future)

Currently uses CSV uploads. Future phases will add:

- [ ] Jamf Pro API integration
- [ ] Microsoft Graph API (Intune, Entra)
- [ ] Qualys API integration
- [ ] Real-time data sync
- [ ] Scheduled report generation

## Contributing

Internal tool for Batten School IT. For questions or feature requests, contact the IT team.

## Support

- **Email**: batten-it@virginia.edu
- **Phone**: (434) 924-3900
- **Service Portal**: https://virginia.service-now.com

## License

Copyright 2025 University of Virginia Batten School. All rights reserved.
