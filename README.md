# 🚌 Bus Sheba — Next-Gen Inter-City Transit Ecosystem

A production-ready **bus ticket booking system** built with **Node.js, Express, TypeScript, and PostgreSQL (Prisma)**. It powers a full online bus-booking experience: passenger registration with email OTP, operator onboarding with document verification, admin-configured routes and stops, AC/non-AC bus management, seat-aware trip booking, bKash payment, automated ticket PDF generation with QR codes, email delivery, and real-time analytics.

<div align="center">

[![Live](https://img.shields.io/badge/Live-Demo-38b2ac?style=for-the-badge&logo=vercel)](https://bus-sheba.vercel.app)
[![API Docs](https://img.shields.io/badge/API-Docs-6B4EFF?style=for-the-badge&logo=postman)](https://documenter.getpostman.com/view/49691439/2sBYAxNof7)
[![GitHub](https://img.shields.io/badge/Source-GitHub-181717?style=for-the-badge&logo=github)](https://github.com/tomalhossencse/Bus-Sheba)

</div>

| | |
|---|---|
| 🌐 **Live API** | https://bus-sheba.vercel.app |
| 📁 **Backend Repo** | https://github.com/tomalhossencse/Bus-Sheba |
| 📝 **API Docs** | https://documenter.getpostman.com/view/49691439/2sBYAxNof7 |

> **Live frontend flow** – passengers search trips → pick seats → book → pay via bKash → get a QR-coded e-ticket by email.

> **Live frontend flow** – passengers search trips → pick seats → book → pay via bKash → get a QR-coded e-ticket by email.

---

## 🚀 Tech Stack

| Layer        | Technology                                                        |
| ------------ | ----------------------------------------------------------------- |
| Runtime      | Node.js 20+                                                       |
| Language     | TypeScript (strict)                                               |
| Framework    | Express 5                                                         |
| ORM          | Prisma 7 (`prisma/schema` multi-file schema)                      |
| Database     | PostgreSQL (via `@prisma/adapter-pg`)                             |
| Validation   | Zod 4                                                            |
| Auth         | JWT (access + refresh, httpOnly cookies), bcrypt, Google OAuth    |
| Payments     | bKash Tokenized Checkout (sandbox/live via env)                  |
| Caching      | Redis (`ioredis`)                                                 |
| Files        | Multer (memory storage) → Cloudinary (images & PDFs)              |
| Email        | Nodemailer (SMTP) with EJS templates                              |
| Tickets      | PDFKit + `qrcode` (QR-coded e-ticket PDF)                         |
| Jobs         | node-cron (seat expiry release + bKash refund processing)         |
| Lint/Format  | Biome                                                             |
| Docs         | Postman collection (`postman.json`)                               |

---

## ✨ Features

### 🔐 Authentication & Users
- **Passenger registration** with email OTP verification (6-digit code via Nodemailer)
- **Login** with strong-password rules + **Google OAuth** sign-in
- **JWT access + refresh token** flow, stored in httpOnly cookies (`sameSite: none` for cross-origin)
- **/me**, update profile (with avatar upload to Cloudinary), change password, forget/reset password
- Role-based access control: `SUPER_ADMIN`, `ADMIN`, `OPERATOR`, `PASSENGER`

### 🧑‍💼 Operator Onboarding
- **Apply as operator** – multipart upload of NID, trade license, and additional documents
- Email **OTP verification**, then **admin approval/rejection** workflow
- Operators manage their own buses, trips, and view their analytics

### 🚌 Bus & Seat Management
- Buses with type (`AC / NON_AC / SLEEPER / SEMI_SLEEPER`), seat layout (`2x2 / 1x2 / 2x1`), and BD registration format validation
- Automatic **seat creation from the seat layout** on bus add
- Bus life-cycle states: `ACTIVE / INACTIVE / MAINTENANCE`

### 🗺️ Routes & Stops
- Routes with source/destination, distance, estimated time, and **ordered stops**
- Each stop has arrival/departure minutes (validated: departure ≥ arrival)
- Soft delete / activate for routes and stops

### 🕐 Trip Scheduling
- Operators create trips on a bus + route with fare and times (dates coerced to `Date`, past departures rejected)
- Trip status lifecycle: `SCHEDULED → BOARDING → DEPARTED → COMPLETED / CANCELLED`
- Trip **search** by source/destination/date for passengers

### 🎫 Booking Engine
- **Segment-aware seat availability** – a seat is only offered when the request segment doesn't overlap an existing held/booked segment on that trip
- Booking creation holds seats in `HELD` state with a **15-minute `expiresAt`**
- `tripSeatIds` validated against the trip; passengers must match seat count
- Expired bookings auto-released (seats → `AVAILABLE`, booking → `EXPIRED`) by the cron job

### 💳 Payments & Tickets (bKash)
- Tokenized bKash checkout initialized per booking (`bKash URL` returned)
- **Payment callback** executes the transaction; on success:
  - Booking → `CONFIRMED`, seats → `BOOKED`, payment → `PAID`
  - **QR-coded e-ticket PDF** generated, uploaded to Cloudinary, emailed to the passenger
- **Refund pipeline** – cron retries pending bKash refunds (max 5 attempts) and auto-fails otherwise

### 📊 Analytics
- **Admin**: platform-wide stats (bookings, revenue, trends)
- **Operator**: own-bus/trip performance
- **Passenger**: total bookings, spending, upcoming/past trips, status breakdown

### 🧮 Cross-Cutting
- Central `catchAsync`, `AppError`, `sendResponse`, `notFound`, and `globalErrorHandler` (maps Prisma `P2002/P2003/P2025` etc.)
- Zod request validation middleware (body, array body, and JSON-in-form for multipart)
- Pagination + search + filter + sort on all list endpoints
- `bookingNumber` (`BS-YYMMDD-XXXX`) and `ticketNumber` generators

---

## 📁 Project Structure

```
src/
├── app.ts                     # Express app + route mounting (/api/v1)
├── server.ts                  # Entry point: DB, Redis, SMTP, seeds, cron
├── app/
│   ├── config/                # Env config
│   ├── lib/                   # prisma, redis, cloudinary, multer, nodemailer, bkash, cron
│   ├── middleware/            # auth, validateRequest, catchAsync… (globalErrorHandler, notFound)
│   ├── module/
│   │   ├── auth/              # register, OTP verify, login, google, profile, tokens
│   │   ├── operator/          # apply, verify, approve, update, list
│   │   ├── bus/               # add/update/deactivate/activate/maintenance, seats
│   │   ├── route/             # routes + CRUD
│   │   ├── routeStop/         # stops + add-many + CRUD
│   │   ├── trip/              # create/update/cancel/status, search, availability, seats
│   │   ├── booking/           # create (seat hold), my / all / by-id
│   │   ├── payment/           # bKash create + callback, my / all / by-id
│   │   └── analytics/         # admin / operator / passenger analytics
│   ├── templates/             # EJS email templates (ticket)
│   ├── types/                 # shared types + Express Request augmentation
│   └── utils/                 # AppError, jwt, seeds, generators, ticket-pdf
├── generated/prisma/          # Prisma-generated client types
└── (prisma/)
    ├── schema/                # multi-file schema (per-model)
    └── migrations/
```

Each module follows a consistent **route → controller → service → validation (→ interface)** layered pattern.

---

## 🔑 Environment Variables (`.env`)

> **Never commit real secrets.** Copy `.env.example` to `.env` and fill in values. A sensible `.env.example` should list every variable used by `src/app/config/index.ts`.

| Variable                    | Description                                          |
| --------------------------- | ---------------------------------------------------- |
| `NODE_ENV`                  | `development` / `production`                         |
| `PORT`                      | Server port (default `5000`)                         |
| `DATABASE_URL`              | PostgreSQL connection string                         |
| `JWT_ACCESS_SECRET`         | Secret for access tokens                             |
| `JWT_REFRESH_SECRET`        | Secret for refresh tokens                            |
| `JWT_ACCESS_EXPIRES_IN`     | e.g. `1d`                                            |
| `JWT_REFRESH_EXPIRES_IN`    | e.g. `7d`                                            |
| `BCRYPT_SALT_ROUNDS`        | Hash rounds (default `10`)                           |
| `FRONTEND_URL`              | CORS origin + redirect base (default `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID`          | Google OAuth client ID                                |
| `REDIS_*`                   | Redis connection (username, password, host, port)    |
| `SMTP_USER` / `SMTP_PASSWORD` / `EMAIL_SENDER` | Nodemailer SMTP credentials    |
| `CLOUDINARY_*`              | Cloudinary name, API key, API secret                  |
| `BKASH_*`                   | bKash base URL, username, password, app key/secret, callback URL |
| `SUPER_ADMIN_*`             | Super admin seed credentials                          |
| `TESTER_ADMIN_*`            | Tester admin seed credentials                         |
| `TESTER_OPERATOR_*`         | Tester operator seed credentials                      |

Seeds run automatically on server start (`server.ts`) creating a **SUPER_ADMIN**, a tester **ADMIN**, and a tester **OPERATOR** from env values.

---

## 🌍 Live Demo

Try the deployed app: **https://bus-sheba.vercel.app**

**Test Admin Credentials:**

| | |
|---|---|
| ✅ **Admin Email** | `testeradmin@gmail.com` |
| ✅ **Admin Password** | `Tester@dmin1` |

> 📝 Full API reference: https://documenter.getpostman.com/view/49691439/2sBYAxNof7

Clone the repository to run it locally:

```bash
git clone https://github.com/tomalhossencse/Bus-Sheba.git
cd Bus-Sheba
```

---

## 🛠️ Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env   # then fill in all values

# 3. Set DATABASE_URL (example)
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bus_sheba?schema=public"

# 4. Regenerate the Prisma client (types land in src/generated/prisma)
npx prisma generate

# 5. Push schema / run migrations
npx prisma migrate dev     # dev
# or
npx prisma db push

# 6. Start the dev server
npm run dev
```

### Redis, SMTP & bKash
- A **running Redis** instance is required at startup (used for rate-limited OTP / tokens).
- **SMTP** credentials are required to send OTP, reset, and ticket emails.
- **bKash** credentials must be valid sandbox values; booking/payment flows depend on them.

---

## 📝 Scripts

| Command                | Description                          |
| ---------------------- | ------------------------------------ |
| `npm run dev`          | Start dev server with hot reload     |
| `npm run build`        | Bundle with `tsup`                   |
| `npm start`            | Run the compiled build               |
| `npm run format:check` | Biome format check                   |
| `npm run format:fix`   | Biome format write                   |
| `npm run lint:check`   | Biome lint check                     |
| `npm run lint:fix`     | Biome lint write (+ autofix)         |

---

## 🌐 API Endpoints

Base URL: `http://localhost:5000/api/v1`

### Auth → `/auth`
| Method | Path                 | Auth          | Description                          |
| ------ | -------------------- | ------------- | ------------------------------------ |
| POST   | `/register`          | Public        | Passenger registration (sends OTP)   |
| POST   | `/verify-email`      | Public        | Verify OTP → login                   |
| POST   | `/login`             | Public        | Login (cookies + tokens)             |
| POST   | `/google`            | Public        | Google OAuth login                   |
| POST   | `/forget-password`   | Public        | Request password-reset OTP           |
| POST   | `/reset-password`    | Public        | Reset password with OTP              |
| POST   | `/change-password`   | Logged-in     | Change password                      |
| PUT    | `/update-profile`    | Logged-in     | Update name/phone + avatar (multipart)|
| GET    | `/me`                | Logged-in     | Current user profile                 |
| POST   | `/refresh-token`     | Public (cookie) | Refresh access token               |

### Operator → `/operator`
| Method | Path          | Auth                  | Description                          |
| ------ | ------------- | --------------------- | ------------------------------------ |
| POST   | `/apply`      | Public                | Apply as operator (multipart docs)   |
| POST   | `/verify-email` | Public               | Verify operator OTP                  |
| PATCH  | `/approve`    | ADMIN / SUPER_ADMIN   | Approve / reject operator            |
| PUT    | `/update`     | OPERATOR              | Update own operator profile          |
| GET    | `/`           | ADMIN / SUPER_ADMIN   | List operators                       |

### Bus → `/bus`
| Method | Path                    | Auth          | Description                    |
| ------ | ----------------------- | ------------- | ------------------------------ |
| POST   | `/add`                  | OPERATOR      | Add bus + auto seat layout     |
| PUT    | `/update/:busId`        | OPERATOR      | Update bus                     |
| PATCH  | `/deactivate/:busId`    | OPERATOR      | Deactivate bus                 |
| PATCH  | `/activate/:busId`      | OPERATOR      | Activate bus                   |
| PATCH  | `/maintenance/:busId`   | OPERATOR      | Mark maintenance               |
| GET    | `/my-buses`             | OPERATOR      | My buses                       |
| GET    | `/`                     | Public        | All buses (search/filter)      |
| GET    | `/operator/:operatorId` | Public        | Buses by operator              |
| GET    | `/:busId/seats`         | Public        | Bus seat layout                |
| GET    | `/:busId`               | Public        | Bus details                    |

### Route → `/route`  (arrival/departure-minute stops)
| Method | Path                          | Auth                | Description                |
| ------ | ----------------------------- | ------------------- | -------------------------- |
| POST   | `/add`                        | ADMIN / SUPER_ADMIN | Add route + optional stops |
| PUT    | `/update/:routeId`            | ADMIN / SUPER_ADMIN | Update route               |
| PATCH  | `/deactivate/:routeId`        | ADMIN / SUPER_ADMIN | Deactivate route           |
| PATCH  | `/activate/:routeId`          | ADMIN / SUPER_ADMIN | Activate route             |
| GET    | `/`                           | Public              | All routes (search/filter) |
| GET    | `/search/:source/:destination`| Public              | Search routes              |
| GET    | `/:routeId`                   | Public              | Route details              |

### Route Stop → `/route-stop`
| Method | Path                        | Auth                | Description                |
| ------ | --------------------------- | ------------------- | -------------------------- |
| POST   | `/add`                      | ADMIN / SUPER_ADMIN | Add single stop            |
| POST   | `/add-many`                 | ADMIN / SUPER_ADMIN | Add multiple stops (array) |
| PUT    | `/update/:stopId`           | ADMIN / SUPER_ADMIN | Update stop                |
| PATCH  | `/deactivate/:stopId`       | ADMIN / SUPER_ADMIN | Soft-delete stop           |
| PATCH  | `/activate/:stopId`         | ADMIN / SUPER_ADMIN | Restore stop               |
| GET    | `/`                         | Public              | All stops                  |
| GET    | `/route/:routeId`           | Public              | Ordered stops of a route   |
| GET    | `/:stopId`                  | Public              | Stop details               |

### Trip → `/trip`
| Method | Path                            | Auth            | Description                          |
| ------ | ------------------------------- | --------------- | ------------------------------------ |
| POST   | `/create`                       | OPERATOR        | Create trip                          |
| PUT    | `/update/:tripId`               | OPERATOR        | Update trip                          |
| PATCH  | `/cancel/:tripId`               | OPERATOR        | Cancel trip                          |
| PATCH  | `/status/:tripId`               | OPERATOR/ADMIN  | Change trip status                   |
| GET    | `/my-trips`                     | OPERATOR        | My trips                             |
| GET    | `/search`                       | Public          | Search trips (`source`,`destination`)|
| GET    | `/`                             | Public          | All trips (search/filter)            |
| GET    | `/:tripId/seats`                | Public          | Trip seats (filter by status)        |
| GET    | `/:tripId/available-seats`      | Public          | Segment-aware available seats        |
| GET    | `/:tripId`                      | Public          | Trip details                         |

### Booking → `/booking`
| Method | Path              | Auth                    | Description                  |
| ------ | ----------------- | ----------------------- | ---------------------------- |
| POST   | `/create`         | PASSENGER               | Create booking (holds seats) |
| GET    | `/my`             | PASSENGER               | My bookings                  |
| GET    | `/`               | ADMIN / SUPER_ADMIN     | All bookings                 |
| GET    | `/:bookingId`     | PASSENGER / ADMIN       | Booking details (own only)   |

### Payment → `/payment`
| Method | Path              | Auth                    | Description                    |
| ------ | ----------------- | ----------------------- | ------------------------------ |
| POST   | `/create`         | PASSENGER               | Init bKash payment for booking |
| GET    | `/callback`       | Public (bKash)          | bKash redirect → confirm+ticket|
| GET    | `/my`             | PASSENGER               | My payments                    |
| GET    | `/`               | ADMIN / SUPER_ADMIN     | All payments                   |
| GET    | `/:paymentId`     | PASSENGER / ADMIN       | Payment details                |

### Analytics → `/analytics`
| Method | Path          | Auth                | Description                       |
| ------ | ------------- | ------------------- | --------------------------------- |
| GET    | `/admin`      | ADMIN / SUPER_ADMIN | Platform-wide analytics           |
| GET    | `/operator`   | OPERATOR            | Operator-scoped analytics         |
| GET    | `/passenger`  | PASSENGER           | Passenger-scoped analytics        |

> A ready-to-import **Postman collection** (`postman.json`) documents every endpoint with example bodies, query params, and auth setup.

---

## 🔄 Background Jobs (node-cron)

| Job                            | Interval  | Purpose                                                              |
| ------------------------------ | --------- | -------------------------------------------------------------------- |
| `updateTripSeats`              | every 5m  | Expire `PENDING` bookings past `expiresAt`, release `HELD` seats, mark booking `EXPIRED` |
| `processRefunds`               | every 10m | Retry `REFUND_PENDING` bKash refunds (max 5 attempts → `FAILED`)     |

---

## 🧾 Booking & Payment Lifecycle

```
Search trip
   │
   ▼
Get available seats (segment-aware)
   │
   ▼
Create booking ──► seats HELD (15 min expiry) ──► [CRON] expired → seats AVAILABLE
   │
   ▼
Initialize bKash payment ──► bKash URL
   │
   ▼
bKash callback (execute)
   │
   ├─► success ─► confirm booking, BOOKED seats, generate
   │              QR e-ticket PDF → Cloudinary → email passenger
   └─► fail/cancel ─► mark payment FAILED/CANCELLED
```

---

## 🧪 Testing

- **Manual API testing:** the bundled `postman.json` collection (register → verify → login saves token → exercise role-based flows).
- **Unit/e2e tests:** not yet configured (`npm test` is a placeholder). Recommended next step: supertest + vitest covering auth, booking-hold expiry, and payment callback idempotency.

---

## ⚠️ Production Considerations

- Set `NODE_ENV=production` and run `npm run build && npm start`.
- Use strong, rotated `JWT_*` secrets and HTTPS.
- Point bKash to the **live** base URL with production app credentials.
- Prefer managed PostgreSQL + Redis; enable backups.
- Add request-rate limiting, helmet, and structured logging (e.g. pino) for production hardening.
- The `.env` currently ships example secrets for local dev — **rotate them before deployment**.

---

## 📄 License

ISC