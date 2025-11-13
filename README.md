# Batten IT Dashboard

A unified IT management dashboard for the Batten School at the University of Virginia. This application provides a single pane of glass for monitoring and managing resources across Jamf, Intune, Qualys, and CoreView.

## Features

- **Unified Device Management**: View all devices from Jamf (Mac) and Intune (Windows) in one place
- **Health Monitoring**: Track device age, compliance status, and replacement needs
- **Security Compliance**: Monitor vulnerabilities from Qualys and security posture
- **Real-time Analytics**: Dashboard metrics showing critical, warning, and healthy devices
- **Data Export**: Export device lists and reports to CSV
- **Search & Filter**: Quickly find devices by name, owner, or model
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Technology Stack

- **Framework**: Next.js 15.1.6
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4.17
- **Icons**: Lucide React 0.469.0
- **Fonts**: Libre Baskerville (serif), Inter (sans-serif)

## Design System

### Color Palette
- **UVA Navy**: `#232D4B` - Primary brand color
- **UVA Orange**: `#E57200` - Accent color for CTAs
- **Light Navy**: `#2A3C5F` - Secondary elements
- **Light Orange**: `#F28C28` - Hover states

### Typography
- **Headings**: Libre Baskerville (serif)
- **Body/UI**: Inter (sans-serif)

## Project Structure

```
BattenITToolBox/
├── app/
│   ├── layout.tsx          # Root layout with font configuration
│   ├── page.tsx            # Main dashboard page
│   └── globals.css         # Global styles and animations
│
├── components/
│   ├── Header.tsx          # Navigation header
│   ├── Footer.tsx          # Footer with contact info
│   ├── MetricCard.tsx      # Dashboard metric cards
│   └── DeviceTable.tsx     # Sortable device table with export
│
├── types/
│   ├── device.ts           # Device and summary types
│   └── metric.ts           # Metric card types
│
├── tailwind.config.js      # Tailwind with UVA brand colors
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies
```

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
```

## Current Status

### ✅ Completed (Phase 1 & 2)
- [x] Project setup with Next.js and TypeScript
- [x] Tailwind CSS configured with UVA brand colors
- [x] Google Fonts integration (Libre Baskerville, Inter)
- [x] Header component with user menu
- [x] Footer component with contact information
- [x] MetricCard component for dashboard statistics
- [x] DeviceTable component with search, sort, and export
- [x] Main dashboard page with mock data
- [x] Responsive design for mobile/tablet/desktop
- [x] TypeScript type definitions for devices and metrics

### 🔄 Next Steps (Phase 3 - API Integration)
- [ ] Jamf API integration for Mac devices
- [ ] Microsoft Intune/Graph API integration for Windows devices
- [ ] Qualys API integration for vulnerability data
- [ ] CoreView API integration for Microsoft 365 data
- [ ] Backend API layer for data aggregation
- [ ] Database setup (PostgreSQL) for caching
- [ ] Redis caching layer for API responses
- [ ] Authentication (Azure AD integration)

### 📋 Future Enhancements (Phase 4)
- [ ] Advanced filtering and saved queries
- [ ] Scheduled reports and email notifications
- [ ] Historical data and trend analysis
- [ ] Custom alert configuration
- [ ] Role-based access control
- [ ] Dashboard customization

## Mock Data

Currently, the application uses mock device data to demonstrate functionality. The mock data includes:
- 6 sample devices (Mac and Windows)
- Various age ranges and compliance statuses
- Sample vulnerability and patch data

This mock data will be replaced with live API calls in Phase 3.

## Use Cases

The dashboard is designed to answer key IT management questions:

1. **"What machines need to be replaced?"**
   - Filters devices by age (>5 years)
   - Shows hardware limitations (RAM, outdated OS)
   - Provides replacement recommendations

2. **"Who is most out of date?"**
   - Tracks days since last update
   - Monitors missing patches
   - Displays OS version compliance

3. **"What's our security posture?"**
   - Vulnerability counts from Qualys
   - Compliance status from Intune/Jamf
   - Critical security alerts

## Contributing

This is an internal tool for the Batten School IT department. For questions or feature requests, contact the IT team.

## Support

- Email: batten-it@virginia.edu
- Phone: (434) 924-3900
- Service Portal: https://virginia.service-now.com

## License

© 2025 University of Virginia Batten School. All rights reserved.
