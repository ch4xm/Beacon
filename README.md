# Beacon 🗺️

A modern, sustainable travel planning platform that helps you discover, plan, and share eco-friendly trips. Beacon combines interactive mapping, community-driven content, and AI-powered itinerary generation to create memorable travel experiences while being mindful of your carbon footprint.

## ✨ Features

### 🗺️ Interactive Map & Pins
- Discover and create location pins with rich details (photos, descriptions, tags)
- Browse community-shared landmarks and hidden gems
- Comment and like pins to engage with the travel community
- View detailed information about each location

### 🌱 Sustainable Trip Planning
- **AI-Powered Itineraries**: Generate personalized travel plans based on your preferences
- **Carbon Footprint Tracking**: Calculate emissions for flights, trains, and other transit options
- **Eco-Hotel Recommendations**: Find environmentally-friendly accommodations
- **Transit Comparison**: Compare multiple transportation options with sustainability ratings
- **Offset Cost Calculation**: Understand the cost to offset your travel's carbon impact

### 🚀 Smart Features
- **Multi-Modal Transit Search**: Search for flights, trains, buses, and driving routes
- **Real-time Route Planning**: Get directions and visualize routes on the map
- **Nearby Recommendations**: Discover pins and landmarks near your destinations
- **Share Itineraries**: Generate shareable links for your planned trips
- **Community Posts**: Share travel stories and experiences with the explore feed

### 🔐 User Management
- Secure authentication with JWT tokens
- Personal pin collections
- User profiles and activity tracking

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Mapping**: Mapbox GL JS & react-map-gl
- **UI Components**: Radix UI, Tailwind CSS
- **Routing**: React Router v7
- **Date Handling**: date-fns, react-day-picker

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express 5
- **API Validation**: express-openapi-validator with OpenAPI 3.0 spec
- **Authentication**: JWT (jsonwebtoken)
- **Database**: SQLite
- **AI Integration**: Google Gemini AI (@google/genai)
- **External APIs**:
  - Amadeus (flight search)
  - Google Routes API (transit routing)
  - Mapbox (geocoding)

### Monorepo Management
- **Package Manager**: pnpm with workspaces
- **Structure**: Frontend, Backend, and GeoData packages

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- pnpm 9.14.3+
- Python 3.x (for GeoData scripts)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Seanathan10/Beacon.git
   cd Beacon
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment variables**

   Create `.env` files in both Frontend and Backend directories:

   **Backend/.env**
   ```env
   JWT_SECRET=your_jwt_secret
   AMADEUS_API_KEY=your_amadeus_key
   AMADEUS_API_SECRET=your_amadeus_secret
   GOOGLE_API_KEY=your_google_api_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

   **Frontend/.env**
   ```env
   VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token
   VITE_API_URL=http://localhost:3000
   ```

4. **Initialize the database**
   ```bash
   cd Backend/database
   ./create.sh
   ```

## 🚀 Running the Application

### Development Mode

Run both frontend and backend concurrently:
```bash
pnpm dev
```

Or run them separately:

**Backend** (runs on http://localhost:3000):
```bash
cd Backend
pnpm dev
```

**Frontend** (runs on http://localhost:5173):
```bash
cd Frontend
pnpm dev
```

### Production Build

**Build the frontend**:
```bash
pnpm build
```

**Start the backend**:
```bash
pnpm start
```

## 📁 Project Structure

```
Beacon/
├── Frontend/              # React frontend application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components (Landing, Home, etc.)
│   │   ├── lib/          # Utility libraries
│   │   ├── types/        # TypeScript type definitions
│   │   └── utils/        # Helper functions
│   ├── public/           # Static assets
│   └── api/              # Vercel serverless functions
│
├── Backend/              # Express backend server
│   ├── routes/          # API route handlers
│   │   ├── auth.ts      # Authentication endpoints
│   │   ├── pins.ts      # Pin CRUD operations
│   │   ├── posts.ts     # Community posts
│   │   ├── comments.ts  # Comments on pins
│   │   ├── likes.ts     # Like functionality
│   │   ├── trip.ts      # Trip planning & AI
│   │   └── share.ts     # Itinerary sharing
│   ├── services/        # External API integrations
│   │   ├── amadeus.ts   # Flight search
│   │   ├── googleRoutes.ts  # Transit routing
│   │   ├── hotelService.ts  # Hotel search
│   │   └── ai.ts        # AI itinerary generation
│   ├── database/        # SQLite database setup
│   ├── utils/           # Backend utilities
│   └── openapi.yml      # API specification
│
└── GeoData/             # Geographic data processing
    ├── get_coords.py    # Geocoding script
    └── landmarks_with_coords.json  # California landmarks
```

## 🔌 API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - User login

### Pins
- `GET /api/pins` - Get all pins
- `GET /api/pins/user` - Get user's pins
- `GET /api/pins/:id` - Get specific pin
- `POST /api/pins` - Create new pin
- `PUT /api/pins/:id` - Update pin
- `DELETE /api/pins/:id` - Delete pin

### Posts
- `GET /api/posts` - Get all community posts
- `POST /api/posts` - Create new post
- `POST /api/posts/:id/upvote` - Upvote a post

### Trip Planning
- `POST /api/trip/plan` - Generate trip plan with AI
- `POST /api/trip/plan/stream` - Streaming AI trip generation
- `POST /api/trip/ask` - Ask AI questions about your trip
- `POST /api/trip/generate-itinerary` - Create detailed itinerary
- `POST /api/trip/local-route` - Get local transportation routes
- `POST /api/trip/nearby-pins` - Find nearby pins

### Sharing
- `POST /api/share` - Create shareable itinerary link
- `GET /api/share/:id` - Get shared itinerary

See [Backend/openapi.yml](Backend/openapi.yml) for complete API documentation.

## 🧪 Testing & Linting

**Frontend linting**:
```bash
cd Frontend
pnpm lint
pnpm lint:fix
```

**Build frontend**:
```bash
cd Frontend
pnpm build
```

## 🌍 Deployment

### Frontend (Vercel)
The frontend is configured for deployment on Vercel:
- Push to your GitHub repository
- Connect to Vercel
- Set environment variables in Vercel dashboard
- Deploy automatically on push

### Backend
Deploy the backend to any Node.js hosting service:
- Set all required environment variables
- Run `npm install` and `npm start`
- Ensure the database is initialized

## 📊 Database Schema

**Tables:**
- `account` - User accounts and authentication
- `pin` - Location pins with coordinates, images, descriptions
- `comment` - Comments on pins
- `likes` - Pin likes by users
- `itinerary` - Saved trip itineraries

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is available under the MIT License.

## 🙏 Acknowledgments

- Mapbox for mapping services
- Google for Gemini AI and Routes API
- Amadeus for flight data
- OpenStreetMap for geographic data
- The open-source community for amazing tools and libraries

## 📧 Contact

For questions or support, please open an issue in the GitHub repository.

---

**Built with ❤️ for sustainable travel**
