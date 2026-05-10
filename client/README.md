# TRIBE - Sports Matchmaking Platform

TRIBE is a full-stack, real-time sports matchmaking platform built to connect players, organizers, and venues. It features a robust MERN architecture with Socket.io for real-time interactions and Redis for scalable background jobs and socket management.

## 🚀 Key Features

*   **Real-time Matchmaking:** Lobbies, live feed updates, and slot counters using Socket.io.
*   **In-Lobby Chat:** Real-time messaging within individual game lobbies.
*   **Complex Feature Sets:** Waitlists, squad vs. squad challenges, ringer alerts via geoproximity, and algorithmic tournament brackets.
*   **Venue System:** Dashboard for venue owners to manage pitches, time slots, and bookings.
*   **Premium UI/UX:** Built with a custom "Warm Precision" design system emphasizing modern, accessible aesthetics.

## 🛠️ Technology Stack

*   **Frontend:** React, Vite, React Router DOM, Axios, Socket.io-client
*   **Backend:** Node.js, Express.js, MongoDB (Mongoose), Socket.io
*   **Background Jobs & Caching:** Redis, BullMQ (delayed jobs and waitlist promotion)
*   **Authentication:** JWT (JSON Web Tokens), bcryptjs

## 📂 Project Structure

```text
tribe-project/
├── client/          # Vite + React frontend application
├── server/          # Express.js backend application
└── README.md        # Project documentation
```

## ⚙️ Prerequisites

Before you begin, ensure you have the following installed:

*   [Node.js](https://nodejs.org/) (v16+)
*   [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas URI)
*   [Redis](https://redis.io/) (Needed for Socket.io scaling and BullMQ)

## 🚀 Getting Started

### 1. Install Dependencies

Open two terminal windows/tabs to run the client and server concurrently.

**Terminal 1 (Server):**

```bash
cd server
npm install
```

**Terminal 2 (Client):**

```bash
cd client
npm install
```

### 2. Environment Variables

Create a `.env` file in the `server` directory and add the following variables:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/tribe_dev
JWT_SECRET=your_super_secret_jwt_key
REDIS_URL=redis://localhost:6379
CLIENT_URL=http://localhost:5173
```

Create a `.env` file in the `client` directory:

```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Running the Application

**Start the Backend (Server directory):**

```bash
npm run dev
```

**Start the Frontend (Client directory):**

```bash
npm run dev
```

The application will be running at `http://localhost:5173` with the backend API accessible at `http://localhost:5000`.

## 🗺️ Implementation Roadmap

The development of TRIBE follows an iterative, 4-phase rollout plan:

1.  **Phase 1: Foundation & Core Loop** - Establishing Auth, database architecture, lobby creation/joining, and live chat.
2.  **Phase 2: Venues & Squads** - Implementing the venue booking ecosystem, comprehensive squad profiles, and squad-based challenges.
3.  **Phase 3: Advanced Capabilities** - Rolling out waitlist automation, algorithmic ringer alerts, and tournament structuring.
4.  **Phase 4: Admin & Polish** - Creating the admin dashboard, integrating file (image) uploads, and extensive UI/UX polish.
