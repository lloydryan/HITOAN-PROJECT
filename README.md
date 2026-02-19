# Restaurant Management System (React + TypeScript + Firebase)

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Copy env file and set Firebase values:
```bash
cp .env.example .env
```

3. Start dev server:
```bash
npm run dev
```

## Firebase Config Env

Set these in `.env`:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## Firebase Setup

1. Enable **Authentication > Email/Password** in Firebase Console.
2. Create Firestore database in production mode.
3. Publish rules from `firestore.rules`.
4. Create first user via Auth.
5. Create matching Firestore user profile in `users/{uid}`:

```json
{
  "displayName": "System Admin",
  "email": "admin@example.com",
  "role": "admin",
  "createdAt": "serverTimestamp"
}
```

## How to Create Admin

- Create account in Firebase Authentication.
- Get UID from user record.
- Insert `users/{uid}` with role `"admin"` in Firestore.

## Admin User Management (In-App)

- Go to `Admin > Users`.
- Create users with email/password, employee ID, and role.
- This page creates:
1. Firebase Authentication user
2. Firestore profile in `users/{uid}`
- Role changes are logged through `USER_ROLE_UPDATE` activity entries.

Crew terminal flow:
- In `Create Order`, enter and validate crew `employeeId` first.
- After validation, create order using menu button selection.
- Order records store crew association (`crewUid`, `crewEmployeeId`, `crewName`).

## Activity Logs System

Every transaction writes to `activityLogs`:

- `MENU_CREATE`
- `MENU_UPDATE`
- `MENU_DELETE`
- `COST_CREATE`
- `ORDER_CREATE`
- `ORDER_STATUS_UPDATE`
- `PAYMENT_CREATE`
- `ORDER_PAYMENT_UPDATE`
- `USER_ROLE_UPDATE`

Implementation files:

- `src/services/logService.ts`
- `src/services/firestoreWithLog.ts`

`createDocWithLog`, `updateDocWithLog`, and `deleteDocWithLog` capture before/after state and write log entries with `serverTimestamp()`.

Payment processing uses `writeBatch()` and atomically:
1. Creates `payments` document
2. Updates `orders.paymentStatus`
3. Writes `PAYMENT_CREATE` and `ORDER_PAYMENT_UPDATE` logs

## Deployment (Firebase Hosting)

1. Login and init:
```bash
firebase login
firebase use <project-id>
```

2. Build and deploy:
```bash
npm run deploy
```

3. SPA rewrite is already configured in `firebase.json`.
