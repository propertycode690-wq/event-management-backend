# System Memory Blueprint, State Management & Migration Roadmap

## 1. Entity State Map & Data Lineage

This document outlines the lineage between current frontend state keys in `src/data/mockData.js` & `src/context/AppContext.jsx` and the target Prisma Database schema.

### Data Model Mapping Table

| Frontend Mock Key (`mockData.js`) | LocalStorage Key | Target Prisma DB Model | Key Attributes & Schema Types |
| :--- | :--- | :--- | :--- |
| `INITIAL_USERS` | `nh_currentUser`, `nh_users` | `User` | `id` (UUID), `email` (Unique), `password` (Bcrypt Hash), `role` (Enum), `name`, `stateId`, `clubId` |
| `INITIAL_MEMBERS` | `nh_members` | `Member` | `id`, `name`, `email`, `phone`, `state`, `club`, `status`, `duesAmount`, `joinDate` |
| `INITIAL_STATES` | N/A (Static Reference) | `StateAssociation` | `id`, `name`, `code` (Unique), `organizations` (`String[]`), `clubsCount`, `membersCount`, `revenue` |
| `INITIAL_CLUBS` | `nh_clubs` | `LocalClub` | `id`, `name`, `city`, `county`, `state`, `stateCode`, `zip`, `dogType`, `federation`, `revenue` |
| `INITIAL_DOGS` | `nh_dogs` | `Dog` | `id`, `callName`, `registeredName`, `breed`, `regNo` (Unique), `owner`, `ownerEmail` |
| `INITIAL_EVENTS` | `nh_events` | `Event` | `id`, `name`, `type`, `club`, `clubId`, `state`, `stateCode`, `date`, `fee`, `entriesCount`, `maxCapacity` |
| `INITIAL_ENTRIES` | `nh_entries` | `EventEntry` | `id`, `eventId`, `dogId`, `participant`, `handlerPhone`, `fee`, `paymentStatus`, `confirmationCode` |
| `INITIAL_ORDERS` | `nh_orders_v2` | `Order` | `id`, `orderNumber`, `customerName`, `total`, `items` (JSON), `status`, `createdAt` |
| `INITIAL_PRODUCTS` | N/A (Static Reference) | `Product` | `id`, `name`, `price`, `category`, `scopeChannel`, `scopeEntity`, `profit` |
| `INITIAL_TRANSACTIONS` | `nh_transactions` | `FinancialTransaction`| `id`, `type`, `category`, `amount`, `period`, `stateId`, `clubId`, `description` |
| N/A (New Module) | `nh_donations` | `DonationPledge` | `id`, `entityType` (`STATE`/`CLUB`), `entityId`, `amount`, `tier`, `cause`, `donorEmail` |

---

## 2. State Synchronization Policy (`AppContext.jsx` <-> Express API)

Currently, `AppContext.jsx` uses browser `localStorage` to persist modifications across browser reloads. The Express + Prisma backend replaces this mechanism cleanly:

```
[Browser Action] ──> [React AppContext] ──> [HTTP Authorization: Bearer JWT]
                                                      │
                                                      ▼
[Prisma DB Update] <── [Controller/Service] <── [Express REST Router]
```

### Key Migration Mapping Guidelines
1. **Users & Authentication:**
   - Legacy: `localStorage.getItem('nh_currentUser')`
   - Target: `POST /api/v1/auth/login` returning JWT bearer token. Token stored in HTTP-Only Cookie or Secure LocalStorage.
2. **Members Roster:**
   - Legacy: `localStorage.getItem('nh_members')`
   - Target: `GET /api/v1/members` with Express pagination & role filtering.
3. **Events & Registrations:**
   - Legacy: `localStorage.getItem('nh_events')`, `localStorage.getItem('nh_entries')`
   - Target: `POST /api/v1/events/:id/pre-signup` performing atomic database transactions via `prisma.$transaction()`.
4. **Financial Overview Reports:**
   - Legacy: Computed dynamically inside `ReportsAnalyticsPage.jsx` using `periodFactor` scaling.
   - Target: Computed server-side in `reportService.js` via Prisma aggregate queries (`prisma.financialTransaction.aggregate()`).

---

## 3. Caching & Persistence Strategy

To maintain sub-100ms response times across public directories (States list, Local Clubs list, Sanctioned Events):

1. **In-Memory Redis Caching Layer:**
   - `GET /api/v1/states` cached with TTL = 1 hour (Key: `cache:states:all`).
   - `GET /api/v1/clubs` cached with TTL = 30 minutes (Key: `cache:clubs:query`).
   - Cache invalidation triggers automatically on any state or club mutation (`POST`/`PUT`/`DELETE`).
2. **Database Connection Pooling:**
   - Prisma Client configured with PostgreSQL connection pooling (`connection_limit=20`).

---

## 4. Initial Seed & Migration Execution Plan

1. Run Prisma migration:
   ```bash
   npx prisma migrate dev --name init_nh_schema
   ```
2. Populate database with seed data from `src/data/mockData.js`:
   ```bash
   npx prisma db seed
   ```
