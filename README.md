# ICCICT Backend — quick map

version: 1.1

## Structure (top folders)

- ICCICT-backend

## package.json

- path: `ICCICT-backend/package.json`
- name: **registration-backend**
- main: `src/app.js`
- scripts:
  - start: `node src/app.js`
  - dev: `nodemon src/app.js`
  - build: `npx prisma generate`
  - postinstall: `npx prisma generate`
- dependencies:

  - @prisma/client: ^6.3.1
  - bcrypt: ^5.1.1
  - cloudinary: ^1.41.0
  - cors: ^2.8.5
  - dotenv: ^8.2.0
  - express: ^4.17.1
  - jsonwebtoken: ^9.0.2
  - mongoose: ^5.10.9
  - multer: ^1.4.5-lts.2
  - multer-storage-cloudinary: ^4.0.0
  - nodemailer: ^6.10.0

- controllers: 8 files
- models: 0 files
- routes: 8 files

## Endpoints (sample)

- `DELETE` /admins/:id _(in ICCICT-backend/src/routes/adminRoutes.js)_
- `DELETE` /keynote-speakers/:id _(in ICCICT-backend/src/routes/adminRoutes.js)_
- `DELETE` /registrations/:id _(in ICCICT-backend/src/routes/adminRoutes.js)_
- `DELETE` /speakers/:id _(in ICCICT-backend/src/routes/adminRoutes.js)_
- `DELETE` /sponsors/:id _(in ICCICT-backend/src/routes/adminRoutes.js)_
- `GET` /all _(in ICCICT-backend/src/routes/adminRoutes.js)_
- `GET` /dashboard-stats _(in ICCICT-backend/src/routes/adminRoutes.js)_
- `GET` /info _(in ICCICT-backend/src/routes/adminRoutes.js)_
- `GET` /keynote-speakers _(in ICCICT-backend/src/routes/adminRoutes.js)_
- `GET` /keynote-speakers/:id _(in ICCICT-backend/src/routes/adminRoutes.js)_
- `GET` /keynote-speakers/admin/stats _(in ICCICT-backend/src/routes/adminRoutes.js)_
- `GET` /referred-users _(in ICCICT-backend/src/routes/adminRoutes.js)_
- `GET` /registrations _(in ICCICT-backend/src/routes/adminRoutes.js)_
- `GET` /registrations/:id _(in ICCICT-backend/src/routes/adminRoutes.js)_
- `GET` /speakers _(in ICCICT-backend/src/routes/adminRoutes.js)_
- `GET` /speakers/:id _(in ICCICT-backend/src/routes/adminRoutes.js)_
- `GET` /speakers/stats _(in ICCICT-backend/src/routes/adminRoutes.js)_
- `GET` /sponsors _(in ICCICT-backend/src/routes/adminRoutes.js)_
- `GET` /sponsors/:id _(in ICCICT-backend/src/routes/adminRoutes.js)_
- `PATCH` /keynote-speakers/:id/status _(in ICCICT-backend/src/routes/adminRoutes.js)_
- `POST` /create _(in ICCICT-backend/src/routes/adminRoutes.js)_
- `POST` /login _(in ICCICT-backend/src/routes/adminRoutes.js)_
- `PUT` /keynote-speakers/:id _(in ICCICT-backend/src/routes/adminRoutes.js)_
- `PUT` /registrations/:id _(in ICCICT-backend/src/routes/adminRoutes.js)_
- `PUT` /speakers/:id _(in ICCICT-backend/src/routes/adminRoutes.js)_
- `PUT` /sponsors/:id _(in ICCICT-backend/src/routes/adminRoutes.js)_
- `GET` /users _(in ICCICT-backend/src/routes/conferenceRegistrationRoutes.js)_
- `POST` /register _(in ICCICT-backend/src/routes/conferenceRegistrationRoutes.js)_
- `DELETE` /:id _(in ICCICT-backend/src/routes/contact.js)_
- `GET` / _(in ICCICT-backend/src/routes/contact.js)_
- `POST` / _(in ICCICT-backend/src/routes/contact.js)_
- `DELETE` /admin/:id _(in ICCICT-backend/src/routes/keynoteSpeakerRoutes.js)_
- `GET` / _(in ICCICT-backend/src/routes/keynoteSpeakerRoutes.js)_
- `GET` /:id _(in ICCICT-backend/src/routes/keynoteSpeakerRoutes.js)_
- `GET` /admin/all _(in ICCICT-backend/src/routes/keynoteSpeakerRoutes.js)_
- `GET` /admin/stats _(in ICCICT-backend/src/routes/keynoteSpeakerRoutes.js)_
- `PATCH` /admin/:id/status _(in ICCICT-backend/src/routes/keynoteSpeakerRoutes.js)_
- `POST` /register _(in ICCICT-backend/src/routes/keynoteSpeakerRoutes.js)_
- `PUT` /admin/:id _(in ICCICT-backend/src/routes/keynoteSpeakerRoutes.js)_
- `DELETE` /members/:id _(in ICCICT-backend/src/routes/reviewingCommitteeRoutes.js)_
- `GET` /active-members _(in ICCICT-backend/src/routes/reviewingCommitteeRoutes.js)_
- `GET` /members _(in ICCICT-backend/src/routes/reviewingCommitteeRoutes.js)_
- `GET` /stats _(in ICCICT-backend/src/routes/reviewingCommitteeRoutes.js)_
- `POST` /members _(in ICCICT-backend/src/routes/reviewingCommitteeRoutes.js)_
- `POST` /send-speaker/:speakerId _(in ICCICT-backend/src/routes/reviewingCommitteeRoutes.js)_
- `PUT` /members/:id _(in ICCICT-backend/src/routes/reviewingCommitteeRoutes.js)_
- `PUT` /speaker-status/:speakerId _(in ICCICT-backend/src/routes/reviewingCommitteeRoutes.js)_
- `DELETE` /speakers/:id _(in ICCICT-backend/src/routes/speakerRoutes.js)_
- `GET` /speakers _(in ICCICT-backend/src/routes/speakerRoutes.js)_
- `GET` /speakers/:id _(in ICCICT-backend/src/routes/speakerRoutes.js)_
- `GET` /stats _(in ICCICT-backend/src/routes/speakerRoutes.js)_
- `PATCH` /speakers/:id/status _(in ICCICT-backend/src/routes/speakerRoutes.js)_
- `POST` /register _(in ICCICT-backend/src/routes/speakerRoutes.js)_
- `GET` /sponsors _(in ICCICT-backend/src/routes/sponsorRegistrationRoutes.js)_
- `POST` /register _(in ICCICT-backend/src/routes/sponsorRegistrationRoutes.js)_
- `GET` / _(in ICCICT-backend/src/routes/userRoutes.js)_
- `POST` /register _(in ICCICT-backend/src/routes/userRoutes.js)_

## Env vars referenced

ADMIN_EMAIL, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME, EMAIL_ID, EMAIL_PASSWORD, EMAIL_USER, JWT_SECRET, NODE_ENV, PASSWORD_EMAIL, PORT

# Registration Backend

This project is a backend application for handling user registration using Node.js, Express, and MongoDB. It provides endpoints for user registration and retrieving registered users.

## Project Structure

```
registration-backend
├── src
│   ├── controllers
│   │   └── registrationController.js
│   ├── models
│   │   └── registrationModel.js
│   ├── routes
│   │   └── registrationRoutes.js
│   ├── app.js
│   └── config
│       └── db.js
├── package.json
├── .env
└── README.md
```

## Installation

1. Clone the repository:

   ```
   git clone <repository-url>
   cd registration-backend
   ```

2. Install the dependencies:

   ```
   npm install
   ```

3. Create a `.env` file in the root directory and add your MongoDB connection string:
   ```
   MONGODB_URI=<your-mongodb-connection-string>
   ```

## Usage

1. Start the server:

   ```
   npm start
   ```

2. The server will run on `http://localhost:5000`.

## API Endpoints

- `POST /register`: Register a new user.
- `GET /users`: Retrieve all registered users.
