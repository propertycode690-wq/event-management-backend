# RESTful API Specification & Payload Contracts

## 1. Global Conventions & Standard Envelopes

- **Base URL:** `/api/v1`
- **Headers:** `Content-Type: application/json`
- **Authentication:** `Authorization: Bearer <jwt_token>`

### Standard Success Response Envelope
```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully",
  "timestamp": "2026-08-17T12:00:00.000Z"
}
```

### Standard Error Response Envelope
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested resource could not be found",
    "details": []
  },
  "timestamp": "2026-08-17T12:00:00.000Z"
}
```

---

## 2. Auth & User Management Endpoints (`/api/v1/auth`)

### 2.1 Register User
- **Method:** `POST`
- **Path:** `/api/v1/auth/register`
- **Auth:** Public
- **Request Payload:**
```json
{
  "name": "Lalit Panchole",
  "email": "demo@example.com",
  "password": "SecurePassword123!",
  "role": "MEMBER",
  "phone": "(800) 555-0192",
  "stateCode": "TX",
  "clubId": "club-1"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr-101",
      "name": "Lalit Panchole",
      "email": "demo@example.com",
      "role": "MEMBER"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered successfully"
}
```

### 2.2 Login User
- **Method:** `POST`
- **Path:** `/api/v1/auth/login`
- **Auth:** Public
- **Request Payload:**
```json
{
  "email": "demo@example.com",
  "password": "SecurePassword123!"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr-101",
      "name": "Lalit Panchole",
      "email": "demo@example.com",
      "role": "MEMBER"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

### 2.3 Get Current User Profile
- **Method:** `GET`
- **Path:** `/api/v1/auth/me`
- **Auth:** Bearer Token
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "usr-101",
    "name": "Lalit Panchole",
    "email": "demo@example.com",
    "role": "MEMBER",
    "stateId": "tx",
    "clubId": "club-1"
  }
}
```

---

## 3. State Associations Endpoints (`/api/v1/states`)

### 3.1 List All State Associations (With Organization Filter)
- **Method:** `GET`
- **Path:** `/api/v1/states?organization=UKC&search=Texas`
- **Auth:** Public
- **Query Parameters:**
  - `organization`: `All` | `UKC` | `PKC` (Filters state by assigned organization array)
  - `search`: Filter by state name, code, or director name
- **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "tx",
      "name": "Texas Hound Association",
      "code": "TX",
      "organizations": ["UKC", "PKC"],
      "adminName": "Austin Sterling",
      "clubsCount": 54,
      "membersCount": 3920,
      "eventsCount": 7,
      "revenue": 245000.00
    }
  ]
}
```

### 3.2 Get Single State Association Details
- **Method:** `GET`
- **Path:** `/api/v1/states/:id`
- **Auth:** Public
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "tx",
    "name": "Texas Hound Association",
    "code": "TX",
    "organizations": ["UKC", "PKC"],
    "adminName": "Austin Sterling",
    "description": "Governing state charter for Texas field trials and coonhound hunts.",
    "officers": [
      { "name": "Austin Sterling", "title": "State Director" },
      { "name": "Marcus Vance", "title": "Vice State Director" }
    ]
  }
}
```

### 3.3 Pledge State Donation
- **Method:** `POST`
- **Path:** `/api/v1/states/:id/donations/pledge`
- **Auth:** Public / Bearer Token
- **Request Payload:**
```json
{
  "amount": 100.00,
  "tier": "Patron Tier",
  "cause": "Youth Trial & Mentorship Fund",
  "donorName": "Lalit Panchole",
  "donorEmail": "demo@example.com"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "pledgeId": "plg-state-901",
    "stateId": "tx",
    "amount": 100.00,
    "status": "PENDING_GATEWAY",
    "message": "State donation pledge recorded successfully. Ready for payment gateway integration."
  }
}
```

---

## 4. Local Chartered Clubs Endpoints (`/api/v1/clubs`)

### 4.1 List Local Chartered Clubs
- **Method:** `GET`
- **Path:** `/api/v1/clubs?state=TX&dogType=Treeing Walker Coonhound&distance=30`
- **Auth:** Public
- **Query Parameters:**
  - `state`: State filter
  - `county`: County filter
  - `zip`: ZIP code radius filter
  - `distance`: Max miles filter
  - `dogType`: Breed filter
  - `federation`: UKC / PKC / AKC / UHC
  - `eventType`: Nite Hunt / Field Trial / Water Race / Bench Show
- **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "club-1",
      "name": "Oak Ridge Hunting Club",
      "city": "Knoxville",
      "county": "Knox County",
      "state": "Tennessee",
      "stateCode": "TN",
      "distanceMiles": 18,
      "dogType": "Treeing Walker Coonhound",
      "federation": "UKC (United Kennel Club)",
      "eventType": "Nite Hunt",
      "membersCount": 84,
      "eventsCount": 6,
      "entriesCount": 217
    }
  ]
}
```

### 4.2 Pledge Club Donation
- **Method:** `POST`
- **Path:** `/api/v1/clubs/:id/donations/pledge`
- **Auth:** Public / Bearer Token
- **Request Payload:**
```json
{
  "amount": 50.00,
  "tier": "Club Partner Tier",
  "cause": "Clubhouse & Kennel Repair",
  "donorName": "Lalit Panchole",
  "donorEmail": "demo@example.com"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "pledgeId": "plg-club-402",
    "clubId": "club-1",
    "amount": 50.00,
    "status": "PENDING_GATEWAY",
    "message": "Club donation pledge recorded successfully."
  }
}
```

---

## 5. Reports & Financial Overview Endpoints (`/api/v1/reports`)

### 5.1 Get Financial Overview Report
- **Method:** `GET`
- **Path:** `/api/v1/reports/financial-overview?period=monthly&startDate=2026-08-01&endDate=2026-08-31`
- **Auth:** Bearer Token (State Admin / National Admin / Super Admin)
- **Query Parameters:**
  - `period`: `daily` | `weekly` | `monthly` | `custom`
  - `startDate`: Required if `period=custom` (YYYY-MM-DD)
  - `endDate`: Required if `period=custom` (YYYY-MM-DD)
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "period": "monthly",
    "currency": "USD",
    "summary": {
      "membershipRevenue": 940.00,
      "eventsRevenue": 5901.75,
      "merchandiseRevenue": 0.00,
      "fundraisingRevenue": 1850.00,
      "donationsRevenue": 1250.00,
      "totalRevenue": 9941.75
    },
    "metadata": {
      "generatedAt": "2026-08-17T12:00:00.000Z",
      "backendEndpoint": "GET /api/v1/reports/financial-overview"
    }
  }
}
```

---

## 6. Events & Registrations Endpoints (`/api/v1/events`)

### 6.1 Pre-Registration Entry
- **Method:** `POST`
- **Path:** `/api/v1/events/:id/pre-signup`
- **Auth:** Bearer Token
- **Request Payload:**
```json
{
  "dogId": "dog-1",
  "handlerName": "Lalit Panchole",
  "handlerPhone": "(800) 555-0192",
  "entryFee": 30.00,
  "paymentStatus": "Paid"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "entryId": "ent-9041",
    "eventId": "evt-1",
    "confirmationCode": "UHC-TX-2026-8819",
    "status": "CONFIRMED"
  }
}
```
