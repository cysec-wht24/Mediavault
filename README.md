<div align="center">

# 🎬 MediaVault

**Production SaaS platform for automated video repurposing and format conversion**

[![Next.js](https://img.shields.io/badge/Next.js_15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)](https://cloudinary.com/)
[![Vercel](https://img.shields.io/badge/Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/)

[Live Demo](https://playstar-pi.vercel.app/) · [GitHub](https://github.com/cysec-wht24/Mediavault.git)

</div>

---

## 📸 Demo

> 🎥 **[Watch full product walkthrough →](#)** *(drop your video link here)*

---

## Overview

MediaVault is a **browser-based SaaS tool** that lets users upload, organize, and repurpose videos without touching a single desktop app. Users upload once and get back transformation-ready URLs across any aspect ratio, resolution, or format — instantly, from any device.

Built end-to-end with a secure REST API, JWT authentication, email verification, Cloudinary signed upload pipelines, and persistent playlist management backed by MongoDB.

---

## ✨ Features

| Feature | Details |
|---|---|
| **Secure Auth** | JWT-based login/signup with email verification via Nodemailer |
| **Signed Upload Pipeline** | Server-side Cloudinary signature generation — API secret never exposed to the client |
| **Video Transformation API** | Aspect ratio, resolution, and format conversion on demand via a single POST endpoint |
| **Playlist Management** | Create, browse, and manage named playlists with auto-generated thumbnails |
| **Format Conversion** | MP4, WebM, MOV, AVI — enforced allowlist, no unsupported formats accepted |
| **Resolution Presets** | 1080p, 720p, 480p, 360p with Cloudinary `auto:good` quality tuning |
| **Aspect Ratio Presets** | 16:9 · 9:16 · 1:1 · 4:3 · 21:9 · 4:5 — smart AI crop with `gravity: auto` |
| **Workspace** | Per-user media library with thumbnails pulled at 2-second offset |
| **Profile & Settings** | Editable profile picture (Cloudinary-hosted), full name, and account settings |
| **Protected Routes** | Next.js Edge Middleware guards all `/profile/*` routes without client-side flicker |

---

## 🏗️ Architecture

```
MediaVault/
├── src/
│   ├── app/
│   │   ├── api/users/
│   │   │   ├── login/          # POST — credential validation, JWT cookie
│   │   │   ├── logout/         # GET  — cookie clear
│   │   │   ├── signup/         # POST — bcrypt hash, email verification token
│   │   │   ├── verifyemail/    # GET  — token-based email confirmation
│   │   │   ├── me/             # GET  — auth guard, returns current user
│   │   │   ├── profile/        # GET/POST — playlist CRUD
│   │   │   ├── workspace/      # GET/POST/DELETE — video management
│   │   │   ├── transform/      # POST — Cloudinary transformation URL generation
│   │   │   ├── sign-cloudinary-params/  # POST — signed upload params
│   │   │   └── settings/       # PATCH — profile update
│   │   ├── login/              # Login page
│   │   ├── signup/             # Signup page
│   │   ├── verifyemail/        # Email verification page
│   │   └── profile/
│   │       ├── page.tsx        # Playlist dashboard
│   │       ├── workspace/      # Media workspace
│   │       └── settings/       # Account settings
│   ├── models/
│   │   ├── userModel.js        # Mongoose User schema
│   │   └── playlistModel.js    # Mongoose Playlist schema (compound unique index)
│   ├── helpers/
│   │   ├── getDataFromToken.ts # JWT extraction from HttpOnly cookie
│   │   ├── getDataFromCloudinary.ts
│   │   └── mailer.ts           # Nodemailer + token dispatch
│   ├── dbConfig/
│   │   └── dbConfig.ts         # Mongoose connection singleton
│   └── middleware.ts           # Edge Middleware — route protection
```

---

## 🛡️ Security Design

- **Signed Cloudinary uploads** — server generates the upload signature; the API secret is never sent to the browser
- **HttpOnly JWT cookies** — tokens inaccessible to JavaScript; no `localStorage` exposure
- **bcryptjs password hashing** — salted at rest
- **Email verification gate** — accounts not usable until verified via tokenized link
- **Edge Middleware auth guard** — `/profile/*` routes redirect unauthenticated requests before any page renders
- **Input validation** — format allowlist enforced at the API layer; invalid aspect ratios and resolutions are rejected

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript 5 |
| **Database** | MongoDB Atlas + Mongoose 8 |
| **Media CDN** | Cloudinary (upload, transformation, thumbnail generation) |
| **Auth** | JSON Web Tokens + bcryptjs |
| **Email** | Nodemailer |
| **UI** | Tailwind CSS v4, Framer Motion, Radix UI |
| **Deployment** | Vercel |

---

## ⚙️ Local Setup

### Prerequisites

- Node.js 18+
- MongoDB Atlas URI
- Cloudinary account (free tier works)
- SMTP credentials (Mailtrap or similar for dev)

### Steps

```bash
git clone https://github.com/cysec-wht24/Mediavault.git
cd Mediavault
npm install
```

Create a `.env` file at the root:

```env
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/mediavault

SECRET_TOKEN=your_jwt_secret_here
DOMAIN=http://localhost:3000

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

MAIL_USER=your_smtp_user
MAIL_PASS=your_smtp_pass
```

```bash
npm run dev
# → http://localhost:3000
```

---

## 📁 Data Models

### User

```
username        String  (unique)
email           String  (unique)
password        String  (bcrypt hashed)
fullName        String
profilePicture  String  (Cloudinary URL)
isVerified      Boolean
verifyToken     String
verifyTokenExpiry Date
```

### Playlist

```
owner       ObjectId → User
name        String   (unique per user — compound index)
description String
thumbnail   String   (auto-set from first video, Cloudinary)
videos[]    { url, title, thumbnail, addedAt }
timestamps  createdAt, updatedAt
```

---

## 🚀 Deployment

Deployed to **Vercel** with environment variables configured via the Vercel dashboard. The Next.js Edge Middleware runs at the CDN edge — zero cold-start latency on protected route guards.

No additional server config needed. `npm run build` + `vercel --prod` is the full deploy pipeline.

---

## 📄 License

[MIT](./LICENSE)

---