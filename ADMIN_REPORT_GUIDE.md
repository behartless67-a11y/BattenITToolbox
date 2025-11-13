# Administrator Report Guide
## Device Status Criteria & Recommendations

This document explains the criteria used to classify device status (Critical, Warning, Good) for budget planning and administrative decisions.

---

## Status Classification System

### 🔴 **CRITICAL** - Immediate Action Required

Devices marked as CRITICAL require immediate attention and should be prioritized for replacement or remediation.

#### **Criteria for Critical Status:**

1. **Device Age ≥ 5 Years**
   - **Why**: Standard IT lifecycle is 3-5 years. Beyond 5 years, devices experience:
     - Increased failure rates and repair costs
     - Incompatibility with modern software
     - Security vulnerabilities that cannot be patched
     - Poor user productivity due to slow performance
   - **Example**: "Device is 6.2 years old (exceeds 5-year lifecycle)"

2. **Not Updated in 90+ Days**
   - **Why**: Devices not checking in for 90+ days indicate:
     - Device may be lost, stolen, or decommissioned
     - User may have left the organization
     - Critical security patches are missing
     - Device is not manageable remotely
   - **Example**: "Device has not checked in for 120 days (critical threshold: 90 days)"

3. **Running macOS 10.x**
   - **Why**: macOS 10.x (Catalina and earlier) is:
     - No longer supported by Apple (no security updates)
     - Cannot run modern applications
     - Does not support modern security features
     - Incompatible with university-required software
   - **Example**: "Running macOS 10.x which is no longer supported by Apple"

#### **Budget Justification:**
- **Risk of Data Loss**: Unsupported OS = security vulnerabilities
- **Productivity Loss**: Old hardware = slow performance
- **Support Costs**: Old devices require more IT time for troubleshooting
- **Compliance**: Unsupported OS may violate university security policies

---

### ⚠️ **WARNING** - Plan for Replacement

Devices marked as WARNING are approaching end-of-life and should be included in next fiscal year's budget.

#### **Criteria for Warning Status:**

1. **Device Age 3-5 Years**
   - **Why**: Approaching standard replacement cycle
     - Performance begins to degrade
     - Warranty typically expires at 3 years
     - Next OS upgrade may not be supported
     - Should be budgeted for replacement within 12-24 months
   - **Example**: "Device is 3.6 years old (approaching 5-year replacement cycle)"

2. **Not Updated in 30-90 Days**
   - **Why**: Extended periods without updates suggest:
     - Device is not regularly used
     - User may have connectivity issues
     - Device is at risk of missing critical patches
     - Management status should be investigated
   - **Example**: "Device last updated 45 days ago (recommended: within 30 days)"

3. **Running macOS 11.x (Big Sur)**
   - **Why**: macOS 11 is aging and:
     - Will lose Apple support soon
     - Some modern features are not available
     - Should be upgraded to macOS 13+ for security
     - May not support next-generation university software
   - **Example**: "Running macOS 11 which is aging and should be upgraded"

4. **Intel Mac from 2017-2019**
   - **Why**: Intel-based Macs are being phased out:
     - Apple Silicon (M1/M2/M3/M4) offers 2x-3x better performance
     - Better battery life (for laptops)
     - More efficient and quieter operation
     - Future macOS versions may drop Intel support
     - Software developers are optimizing for Apple Silicon
   - **Example**: "Intel-based Mac from 2017-2019 (Apple Silicon offers better performance and efficiency)"

#### **Budget Justification:**
- **Planned Replacement**: Avoid emergency purchases
- **Performance Improvement**: Newer hardware = better productivity
- **Support Efficiency**: Standardize on modern hardware
- **Total Cost of Ownership**: Proactive replacement is cheaper than reactive

---

### ✅ **GOOD** - Current and Compliant

Devices marked as GOOD are within recommended lifecycle and properly maintained.

#### **Criteria for Good Status:**

1. **Device Age < 3 Years**
   - **Why**: Within optimal lifecycle
     - Under warranty (typically 3 years)
     - Performs well with current software
     - Compatible with latest OS versions
     - Lower support costs
   - **Example**: "Device is 1.4 years old (within recommended lifecycle)"

2. **Updated Within 30 Days**
   - **Why**: Regular check-ins indicate:
     - Device is actively used
     - Security patches are current
     - Device is properly managed
     - User is connected to university network
   - **Example**: "Device updated 7 days ago (current and compliant)"

3. **Running Apple Silicon (M1/M2/M3/M4)**
   - **Why**: Modern hardware provides:
     - Best performance and efficiency
     - Full support for all current software
     - 5+ years of OS update support from Apple
     - Excellent user experience
   - **Example**: "Running Apple Silicon (modern, efficient hardware)"

---

## Device Replacement Recommendations

### Priority 1: Critical Devices (Replace This Fiscal Year)

**Criteria:**
- Age ≥ 5 years
- Running macOS 10.x
- Intel Mac from 2017-2018
- Not checked in for 90+ days

**Estimated Devices:** ~15-25 devices (based on typical 3-5% of fleet)

**Cost Justification:**
- **Security Risk**: Unpatched vulnerabilities
- **User Productivity**: Slow, unreliable hardware
- **Support Burden**: Excessive IT time spent on troubleshooting
- **Compliance**: May violate security policies

### Priority 2: Warning Devices (Budget for Next Fiscal Year)

**Criteria:**
- Age 3-5 years
- Intel Mac from 2019-2020
- Running macOS 11.x

**Estimated Devices:** ~40-60 devices

**Cost Justification:**
- **Proactive Planning**: Avoid emergency purchases
- **Standardization**: Move to Apple Silicon for fleet consistency
- **Performance**: Upgrade before user complaints begin
- **Total Cost**: Lower than reactive replacement

---

## Example Status Explanations

### Critical Example:
**Device**: FBS-bh4hb-RET (15-inch MacBook Pro 2017)
**Status Reason**: "Device is 7.7 years old (exceeds 5-year lifecycle); Running macOS 13.6 on Intel hardware from 2017"

**Administrative Explanation**:
This device significantly exceeds the recommended 5-year lifecycle for computer hardware. At 7.7 years old, the device is experiencing:
- Hardware components approaching end-of-life
- Performance inadequate for modern workflow requirements
- Inability to upgrade to latest macOS versions
- Higher probability of catastrophic failure
- Disproportionate IT support time required

**Recommendation**: Immediate replacement with Apple Silicon MacBook (14" or 16" M3/M4)
**Budget Impact**: $1,800 - $2,500 per device

### Warning Example:
**Device**: FBS-gsa4a-2022 (14-inch MacBook Pro 2021, M1 Pro)
**Status Reason**: "Device is 3.6 years old (approaching 5-year replacement cycle)"

**Administrative Explanation**:
This device is approaching the 5-year replacement threshold. While currently performing well, it should be included in replacement planning for FY2026. The device uses M1 Pro which is excellent hardware, but:
- Apple Silicon generations are advancing rapidly (M1 → M2 → M3 → M4)
- Three-year Apple warranty has expired
- Planning now avoids emergency replacement later

**Recommendation**: Budget for replacement in 12-24 months
**Budget Impact**: $2,000 - $2,800 per device

### Good Example:
**Device**: BA-J7X3H6YQY3 (13-inch MacBook Air 2024, M3)
**Status Reason**: "Device is 0.3 years old (within recommended lifecycle); Device updated 8 days ago (current and compliant); Running Apple Silicon (modern, efficient hardware)"

**Administrative Explanation**:
This device represents optimal fleet composition:
- Current generation hardware (M3)
- Under Apple warranty
- Regularly maintained and updated
- Excellent performance for 5+ years
- No action required

**Recommendation**: Continue normal maintenance schedule
**Budget Impact**: $0 (maintenance only)

---

## Replacement Cost Estimates (FY2025)

### Mac Devices:
| Model | Typical Use | Cost Range | Recommended For |
|-------|-------------|------------|-----------------|
| MacBook Air M3 (13") | General use, students | $1,100 - $1,400 | Standard users, email/office work |
| MacBook Air M3 (15") | Power users | $1,300 - $1,600 | Faculty, researchers |
| MacBook Pro M4 (14") | Professional work | $1,800 - $2,500 | Power users, developers |
| MacBook Pro M4 (16") | Heavy workloads | $2,500 - $3,500 | Video editing, data analysis |
| Mac mini M4 | Desktop/shared spaces | $600 - $1,200 | Conference rooms, labs |

### Windows Devices:
| Model | Typical Use | Cost Range | Recommended For |
|-------|-------------|------------|-----------------|
| Surface Laptop | General use | $1,000 - $1,500 | Standard office work |
| Dell Latitude | Enterprise | $1,200 - $1,800 | Business users |
| Surface Pro | Hybrid tablet | $1,300 - $2,000 | Mobile professionals |

---

## Budget Planning Scenarios

### Scenario 1: Address Critical Devices Only
- **Devices**: 20 critical devices
- **Average Cost**: $1,800/device
- **Total Budget**: **$36,000**
- **Timeline**: FY2025
- **Risk**: Warning devices become critical next year

### Scenario 2: Critical + Warning (Recommended)
- **Critical Devices**: 20 devices @ $1,800 = $36,000
- **Warning Devices**: 15 high-priority @ $1,600 = $24,000
- **Total Budget**: **$60,000**
- **Timeline**: FY2025-2026
- **Benefit**: Proactive, avoids emergency replacements

### Scenario 3: Full Fleet Modernization
- **Critical**: 20 devices @ $1,800 = $36,000
- **Warning**: 50 devices @ $1,600 = $80,000
- **Total Budget**: **$116,000**
- **Timeline**: FY2025-2027 (3-year plan)
- **Benefit**: Standardized, modern fleet; reduced support costs

---

## How to Use This Dashboard with Administration

### For Budget Requests:
1. **Export Device List**: Click "Export CSV" to download full report
2. **Filter by Critical**: Show only devices requiring immediate replacement
3. **Include Status Reasons**: Each device has detailed justification
4. **Calculate Total Cost**: Multiply device count by average replacement cost
5. **Present Scenarios**: Show risk of not replacing vs. cost of replacement

### For Progress Tracking:
1. **Monthly Updates**: Re-export CSV files from Jamf/Intune
2. **Track Improvements**: Monitor reduction in critical/warning counts
3. **Verify Replacements**: Confirm new devices show as "Good" status
4. **Update Administration**: Show progress toward fleet modernization

### For Audit/Compliance:
1. **Security Posture**: Show count of devices on unsupported OS
2. **Lifecycle Compliance**: Demonstrate adherence to 5-year policy
3. **Management Coverage**: Track devices not checking in
4. **Replacement Planning**: Document proactive approach

---

## Questions from Administration

### Q: Why 5 years for lifecycle?
**A**: Industry standard based on:
- Manufacturer warranty periods (3 years)
- Hardware reliability curves (failure rates increase after year 4)
- Software compatibility (OS vendors support ~5 years of hardware)
- TCO studies show replacement at 4-5 years is most cost-effective

### Q: Can't we just keep using older devices?
**A**: Risks include:
- **Security**: Unpatched vulnerabilities lead to data breaches
- **Productivity**: Users waste time waiting for slow computers
- **Support**: IT spends 3x more time supporting old hardware
- **Compliance**: May violate university security policies
- **Emergency Costs**: Reactive replacement more expensive than planned

### Q: Why upgrade Intel Macs if they still work?
**A**: Benefits of Apple Silicon:
- **Performance**: 2-3x faster for most tasks
- **Battery Life**: 2x longer (laptops)
- **Compatibility**: Future macOS versions will require Apple Silicon
- **Total Cost**: Better performance = longer usable life = lower TCO

### Q: What about software compatibility with older OS?
**A**: Risks of old OS:
- Microsoft Office requires recent macOS for new features
- Zoom, Teams, Google Chrome drop support for old OS
- Security software can't protect unsupported OS
- University VPN may require current OS

---

## Export Options for Administration

The dashboard provides several export options:

1. **CSV Export**: Full device list with all details
2. **Status Report**: Pre-filtered by Critical/Warning status
3. **Custom Fields**: Include age, OS version, last seen date
4. **Budget Estimates**: Calculate replacement costs

---

## Contact for Questions

For questions about device status criteria or replacement recommendations:
- **IT Department**: batten-it@virginia.edu
- **Dashboard**: http://localhost:3000

---

**Last Updated**: November 12, 2025
**Version**: 1.0
**Author**: Batten IT Department
