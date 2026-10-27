# Platform Business Logic & Governance Rules

## 1. 3-Tier Hierarchy Governance Principles

The National Hunting Network Portal strictly enforces a 3-tier organizational hierarchy across all operations:

```
TIER 1: National Governing Body (UHC / National Admin / Super Admin)
  └── TIER 2: State Associations (State Charters / State Directors)
        └── TIER 3: Local Chartered Clubs (Club Officers / Field Masters)
```

### Tier Governance Rules
1. **Tier 1 (National Level):**
   - Holds global sanctioning authority over hunting sports, rules, and point calculation formulas.
   - Manages platform-wide commission rules, store inventory, and security policies.
2. **Tier 2 (State Association Level):**
   - Governs affiliated Local Clubs within state boundaries (e.g. Texas Hound Association, Tennessee State Association).
   - Sanctions state-level championship trials, coonhound night hunts, and bench shows.
   - Multi-Organization Support: A state association can belong to single or multiple national federations/organizations (e.g., `['UKC', 'PKC']`).
3. **Tier 3 (Local Club Level):**
   - Operates ground-level field trials, night hunts, water races, and bench competitions.
   - Maintains local clubhouse, kennel grounds, and local member rosters.

---

## 2. Financial Revenue Split & Commission Calculation Engine

All platform revenue generated through Event Entries, Merchandise, Dues, Fundraising, and Donations follows strict automated split rules:

### 2.1 Event Registration Fee Splits
- **Default Entry Fee:** $30.00 - $45.00 per entry
- **Distribution Rule:**
  - **Local Hosting Club:** 70% of gross entry fee
  - **State Association Charter:** 20% of gross entry fee (State Margin)
  - **National Platform Treasury:** 10% of gross entry fee (Platform Processing & Sanctioning)

```javascript
// Commission Split Engine Example
function calculateEventFeeSplit(grossEntryFee) {
  const localClubShare = Number((grossEntryFee * 0.70).toFixed(2));
  const stateMarginShare = Number((grossEntryFee * 0.20).toFixed(2));
  const nationalPlatformShare = Number((grossEntryFee * 0.10).toFixed(2));

  return {
    localClubShare,
    stateMarginShare,
    nationalPlatformShare,
    total: grossEntryFee
  };
}
```

### 2.2 Official Store & Merchandise Profit Sharing
- Products listed by local clubs yield a recorded fundraising profit share (e.g., +$12.50 profit per jacket/cap sold).
- Revenue Split:
  - **Item Wholesale/Manufacturing Cost:** Remitted to Supplier/Vendor
  - **Local Club Fundraising Fund:** 60% of net margin
  - **State Association Treasury:** 25% of net margin
  - **National Platform:** 15% of net margin

### 2.3 Annual Membership Dues Distribution
- **Default Annual Dues:** $35.00 / year per member
- **Split Rule:**
  - **State Association Charter:** $20.00 / member
  - **Local Chartered Club:** $10.00 / member
  - **National Administration:** $5.00 / member

### 2.4 Financial Overview Aggregation Rules
The **Financial Overview** module aggregates 5 distinct streams into **Total Revenue**:

$$\text{Total Revenue} = \text{Membership} + \text{Events} + \text{Merchandise} + \text{Fundraising} + \text{Donations}$$

- **Period Filters:**
  - `Daily`: Scaled for 1 day ($\approx 1/30\text{th}$ of monthly baseline)
  - `Weekly`: Scaled for 7 days ($\approx 7/30\text{th}$ of monthly baseline)
  - `Monthly`: Baseline 30-day calculation
  - `Custom`: Scaled dynamically based on exact number of days between `startDate` and `endDate` ($\Delta \text{days} / 30$).

---

## 3. Role-Based Access Control (RBAC) Permission Matrix

| Feature / Resource | Super Admin | National Admin | State Admin | Club Admin | Event Admin | Member |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Global System Config** | ✅ Full | ❌ Read | ❌ Read | ❌ Read | ❌ Read | ❌ None |
| **Manage State Charters** | ✅ Full | ✅ Full | ⚠️ Own State | ❌ None | ❌ None | ❌ None |
| **Manage Local Clubs** | ✅ Full | ✅ Full | ✅ State Clubs| ⚠️ Own Club | ❌ None | ❌ None |
| **Sanction Events** | ✅ Full | ✅ Full | ✅ State Events| ⚠️ Own Events| ✅ Event Scope| ❌ None |
| **Pre-Sign Up Entries** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Self Only |
| **View Financial Reports**| ✅ Global | ✅ Global | ⚠️ State Scope| ⚠️ Club Scope | ❌ None | ❌ None |
| **Pledge Donations** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |

---

## 4. State Association & Organization Filtering Rules

1. **Organization Filter Options:** `All`, `UKC`, `PKC`.
2. **Multi-Organization Future Compatibility:**
   - Every State Association object maintains an array of assigned organizations: `organizations: ['UKC', 'PKC']`.
   - When filter is set to `UKC`, any state having `'UKC'` inside its `organizations` array is displayed.
   - When filter is set to `PKC`, any state having `'PKC'` inside its `organizations` array is displayed.
   - When filter is set to `All`, all active state charters are displayed.
   - The organization filter operates concurrently with text search queries (`searchQuery`).

---

## 5. Donations & Endowment Fund Rules

1. **Dedicated State & Club Donations:**
   - Both State Pages (`/states/:id`) and Local Club Pages (`/clubs/:id`) feature a dedicated **Donations** tab & section.
   - State Donation Causes: Youth Trial & Mentorship Fund, Trail & Land Preservation, Championship Purse & Awards.
   - Local Club Causes: Clubhouse & Kennel Repair, Junior Handler Sponsorship, Trail Access & Safety Equipment.
2. **Non-Processing Readiness Guarantee:**
   - At current stage, donation buttons record pledges and return backend-ready API responses (`POST /api/states/:id/donations/pledge` or `POST /api/clubs/:id/donations/pledge`).
   - No payment gateway execution occurs until explicit client approval in future phase.
