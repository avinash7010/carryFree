# CarryFree - Peer-to-Peer Delivery Platform

A full-stack web application where senders can post packages and travelers can carry them along existing routes.

## 🚀 Quick Start

### Option 1: Use the Startup Script (Windows)
```bash
./start.bat
```
This will start both backend and frontend servers and open the browser automatically.

### Option 2: Manual Start

**Terminal 1 - Backend:**
```bash
cd Backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd Frontend
npm run dev
```

Then open: **http://localhost:5173**

### Option 3: Workspace Scripts
```bash
# From project root
npm run dev:backend
npm run dev:frontend
```

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB Atlas account (or local MongoDB)

## 🔧 Configuration

### Backend (.env)
```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/carryfree
PORT=5000
JWT_SECRET=your_jwt_secret_key
# Optional in production: comma-separated allowed frontend origins
# Example: https://carryfree-frontend.vercel.app,https://admin.carryfree.com
CORS_ORIGIN=
```

### Frontend (.env)
```env
# For local development this can stay /api (uses Vite proxy)
VITE_API_BASE_URL=/api
```

Use `Frontend/.env.example` and `Backend/.env.example` as templates.

## 📁 Project Structure

```
carryFree/
├── Backend/
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Auth middleware
│   │   ├── models/         # Mongoose models
│   │   ├── routes/         # API routes
│   │   ├── utils/          # Helper functions
│   │   ├── app.js          # Express app setup
│   │   └── server.js       # Server entry point
│   └── .env                # Environment variables
│
└── Frontend/
    ├── src/
    │   ├── components/     # React components
    │   ├── services/       # API services
    │   ├── utils/          # Helper utilities
    │   ├── assets/         # Static assets
    │   ├── App.jsx         # Main app component
    │   └── main.jsx        # React entry point
    └── package.json
```

## 🎯 Features

- ✅ User Authentication (Register/Login with role)
- ✅ Post Packages (Sender)
- ✅ Post Trips (Traveler)
- ✅ Route + Date + Capacity Matching
- ✅ Booking Workflow (request, accept/reject, in-transit)
- ✅ OTP Delivery Verification
- ✅ Payment Lock/Release Simulation
- ✅ Package Status Management (`pending`, `matched`, `in-transit`, `delivered`)
- ✅ JWT Token Security and protected routes
- ✅ MongoDB Atlas Integration
- ✅ Responsive UI with Bootstrap 5
- ✅ Legacy Lost & Found module preserved

## 🚀 Deployment Notes

1. Set backend environment values in your deployment platform using `Backend/.env.example`.
2. Set frontend `VITE_API_BASE_URL` to your deployed backend API URL (for example `https://your-backend-domain/api`).
3. Build frontend:
```bash
npm run build:frontend
```
4. Start backend:
```bash
npm run start:backend
```
5. Convenience command:
```bash
npm run deploy
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Packages
- `POST /api/packages` - Post a package (auth required)
- `GET /api/packages/my` - Get sender packages (auth required)
- `GET /api/packages` - Browse packages
- `PATCH /api/packages/:id/status` - Update package status (owner/admin)

### Trips
- `POST /api/trips` - Post a trip (auth required)
- `GET /api/trips/my` - Get traveler trips (auth required)
- `GET /api/trips` - Browse open trips

### Matching
- `GET /api/matches/packages/:packageId` - Fetch ranked traveler matches for a package

### Bookings
- `POST /api/bookings` - Book/request a traveler for a package
- `GET /api/bookings/my` - Get sender/traveler bookings
- `PATCH /api/bookings/:id/respond` - Traveler accepts/rejects booking
- `PATCH /api/bookings/:id/start` - Mark booking in-transit
- `POST /api/bookings/:id/generate-otp` - Sender generates delivery OTP
- `POST /api/bookings/:id/verify-delivery` - Verify OTP, mark delivered, release payment

### Legacy Lost & Found
- `GET /api/lost-items`, `POST /api/lost-items`, `GET /api/lost-items/my`
- `GET /api/found-items`, `POST /api/found-items`, `GET /api/found-items/my`
- `GET /api/match/lost/:id`, `/api/claims/*`

## 🛠️ Tech Stack

**Backend:**
- Node.js + Express.js
- MongoDB + Mongoose
- JWT Authentication
- Bcrypt for password hashing

**Frontend:**
- React 19
- React Router DOM
- Axios
- Bootstrap 5

## 📝 Usage

1. **Register** - Create an account and select role (sender/traveler/receiver)
2. **Login** - Access your dashboard
3. **Post Package** - Sender creates package request
4. **Post Trip** - Traveler creates route with capacity
5. **Match & Book** - Sender fetches matches and books traveler
6. **In Transit + OTP** - Traveler starts transit; sender generates OTP; delivery verified

## 🔐 Security Notes

- Never commit `.env` files to version control
- Change `JWT_SECRET` in production
- Use HTTPS in production
- Implement rate limiting for production

## 👨‍💻 Author

Made with ❤️ by Artist

## 📄 License

ISC
