# System Architecture & Technical Blueprint

## 1. Executive Summary & Tech Stack Overview

The **National Hunting Network Portal (UHC / Ultimate Hound Championships)** backend is built as a enterprise-grade, modular Node.js RESTful API using Express.js, Prisma ORM, JWT authentication, and Bcrypt password security.

### Core Technology Stack
- **Runtime Environment:** Node.js (v18+ LTS)
- **Web Framework:** Express.js (v4.x)
- **ORM / Database Access:** Prisma ORM (v5.x)
- **Database Engine:** PostgreSQL (Production) / SQLite (Local Dev)
- **Authentication & Security:** JWT (JSON Web Tokens) with Bearer token header authorization
- **Password Security:** Bcrypt (`bcryptjs` / `bcrypt` with salt rounds = 12)
- **Architecture Pattern:** Controller-Service-Repository Layered MVC Pattern

```
                       ┌──────────────────────────────────────┐
                       │           React Frontend             │
                       └──────────────────┬───────────────────┘
                                          │ HTTP REST Requests
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Express.js Backend API                           │
│                                                                             │
│  ┌──────────────────┐    ┌──────────────────┐    ┌───────────────────────┐  │
│  │ Express Routers  │───>│ Middleware Stack │───>│      Controllers      │  │
│  │ (/api/v1/...)    │    │ (JWT, RBAC, Val) │    │ (Auth, Events, Store) │  │
│  └──────────────────┘    └──────────────────┘    └───────────┬───────────┘  │
│                                                              │              │
│                                                              ▼              │
│                                                  ┌───────────────────────┐  │
│                                                  │   Business Services   │  │
│                                                  │ (Commission, Reports) │  │
│                                                  └───────────┬───────────┘  │
│                                                              │              │
│                                                              ▼              │
│                                                  ┌───────────────────────┐  │
│                                                  │    Prisma ORM Layer   │  │
│                                                  └───────────┬───────────┘  │
└──────────────────────────────────────────────────────────────┼──────────────┘
                                                               │
                                                               ▼
                                                   ┌───────────────────────┐
                                                   │  PostgreSQL Database  │
                                                   └───────────────────────┘
```

---

## 2. 3-Tier Organizational Hierarchy Architecture

The system enforces a strict 3-Tier Organizational Hierarchy as defined in the platform specifications:

```
                ┌───────────────────────────────────────────┐
                │   TIER 1: NATIONAL GOVERNING BODY (UHC)   │
                │  - Super Admin & National Administrators  │
                │  - Global Rule Setting & Commission Engine│
                └─────────────────────┬─────────────────────┘
                                      │
                                      ▼
                ┌───────────────────────────────────────────┐
                │   TIER 2: STATE ASSOCIATIONS (CHARTERS)   │
                │  - State Directors & Executive Board      │
                │  - Sanctioning State Hunts & Margins      │
                └─────────────────────┬─────────────────────┘
                                      │
                                      ▼
                ┌───────────────────────────────────────────┐
                │        TIER 3: LOCAL CHARTERED CLUBS       │
                │  - Local Club Officers & Field Master     │
                │  - Night Hunts, Bench Shows & Water Races │
                └───────────────────────────────────────────┘
```

---

## 3. Directory & Codebase Layout

```
backend/
├── config/
│   ├── default.js              # Environment settings & fallback configuration
│   └── database.js             # Prisma Client singleton initialization
├── controllers/
│   ├── authController.js       # Register, Login, Me, Token Refresh (JWT + Bcrypt)
│   ├── memberController.js     # Roster management, profiles, membership dues
│   ├── stateController.js      # State Association charters, organization filtering, donations
│   ├── clubController.js       # Local Club directory, filters, claims, donations
│   ├── eventController.js      # Sanctioned events, pre-signups, trial capacity
│   ├── orderController.js      # Merchandise store, profit sharing calculations
│   ├── reportController.js     # Financial Overview (Daily/Weekly/Monthly/Custom) & Performance
│   └── adminController.js      # Platform structure matrix, connected architecture, revenue tracking
├── docs/
│   ├── architecture.md         # System Architecture & Technical Blueprint
│   ├── api_contract.md         # RESTful API Endpoints & Payload Specification
│   ├── business_rules.md       # Platform Business Logic & Governance Rules
│   └── memory.md               # Data Schema Blueprint & Persistence Strategy
├── middlewares/
│   ├── authMiddleware.js       # Verification of JWT Bearer Tokens
│   ├── rbacGuard.js            # Role-Based Access Control (Super Admin, State Admin, Club Admin)
│   ├── errorHandler.js        # Global Express exception handler
│   └── validateRequest.js     # Request payload validation middleware
├── prisma/
│   ├── schema.prisma           # Database schema & entity relations
│   ├── migrations/             # SQL Migration history
│   └── seed.js                 # Initial seed script from mockData.js
├── routes/
│   ├── authRoutes.js           # /api/v1/auth
│   ├── memberRoutes.js         # /api/v1/members
│   ├── stateRoutes.js          # /api/v1/states
│   ├── clubRoutes.js           # /api/v1/clubs
│   ├── eventRoutes.js          # /api/v1/events
│   ├── orderRoutes.js          # /api/v1/orders
│   ├── reportRoutes.js         # /api/v1/reports
│   └── adminRoutes.js          # /api/v1/admin
├── services/
│   ├── authService.js          # Password hashing (Bcrypt), JWT generation
│   ├── commissionService.js    # Revenue split calculation engine (National/State/Club)
│   └── reportService.js        # Aggregation algorithms for financial summaries
├── utils/
│   ├── logger.js               # Structured application logging
│   └── responseHandler.js      # Standardized JSON response formatting
└── server.js                   # Application bootstrap & Express server launcher
```

---

## 4. Authentication & Security Architecture (JWT + Bcrypt)

### Password Hashing (Bcrypt)
All user passwords are hashed prior to persistence in the database using `bcryptjs` with salt rounds = 12:

```javascript
// Password Hashing Workflow
const bcrypt = require('bcryptjs');

async function hashPassword(plainPassword) {
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(plainPassword, salt);
}

async function verifyPassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}
```

### Token Authentication (JWT)
Upon successful credential validation, the server signs a JWT containing the user's ID, email, role, stateId, and clubId:

```javascript
// JWT Generation Workflow
const jwt = require('jsonwebtoken');

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      stateId: user.stateId,
      clubId: user.clubId
    },
    process.env.JWT_SECRET || 'antigravity-nh-secret-key-2026',
    { expiresIn: '24h' }
  );
}
```

### Middleware Guard Stack
```javascript
// JWT Guard Example
const verifyJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Token missing' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired token' });
  }
};
```

---

## 5. Prisma ORM Data Model Overview

The Prisma schema defines entities matching the platform state:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  SUPER_ADMIN
  NATIONAL_ADMIN
  STATE_ADMIN
  CLUB_ADMIN
  MEMBER
  EVENT_ADMIN
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String   // Bcrypt Hashed
  name      String
  role      Role     @default(MEMBER)
  phone     String?
  stateId   String?
  clubId    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model StateAssociation {
  id            String   @id @default(uuid())
  name          String
  code          String   @unique
  organizations String[] // ['UKC', 'PKC']
  adminName     String?
  adminEmail    String?
  logo          String?
  description   String?
  clubsCount    Int      @default(0)
  membersCount  Int      @default(0)
  eventsCount   Int      @default(0)
  revenue       Float    @default(0.0)
  createdAt     DateTime @default(now())
}

model LocalClub {
  id            String   @id @default(uuid())
  name          String
  city          String
  county        String?
  state         String
  stateCode     String
  stateId       String
  zip           String?
  distanceMiles Float?
  dogType       String?
  federation    String?
  eventType     String?
  membersCount  Int      @default(0)
  eventsCount   Int      @default(0)
  entriesCount  Int      @default(0)
  revenue       Float    @default(0.0)
  adminName     String?
  logo          String?
  description   String?
  createdAt     DateTime @default(now())
}

model Event {
  id             String   @id @default(uuid())
  name           String
  federation     String
  sport          String?
  type           String
  club           String
  clubId         String
  state          String
  stateCode      String
  city           String
  date           String
  startTime      String?
  fee            Float
  entriesCount   Int      @default(0)
  maxCapacity    Int      @default(50)
  paidEntries    Int      @default(0)
  pendingEntries Int      @default(0)
  status         String   @default("Registration Open")
  description    String?
  image          String?
  createdAt      DateTime @default(now())
}

model FinancialTransaction {
  id          String   @id @default(uuid())
  type        String   // INCOME / EXPENSE
  category    String   // Membership, Events, Merchandise, Fundraising, Donations
  amount      Float
  period      String   // Daily, Weekly, Monthly, Custom
  stateId     String?
  clubId      String?
  description String?
  createdAt   DateTime @default(now())
}
```
