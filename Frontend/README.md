# Beacon Frontend

Frontend application for Beacon - a sustainable travel planning and local discovery platform built with React, Vite, and Mapbox.

## Prerequisites

- Node.js 18+
- pnpm 9+
- Mapbox account and API tokens
- LocationIQ API token

## Environment Configuration

The application uses different backend URLs based on the environment:

- **Development**: Uses local backend at `http://localhost:3000` (proxied through Vite dev server)
- **Production**: Uses hosted backend at `https://api.truthnuke.tech`

### Environment Files

- `.env` - Base configuration (committed, used as fallback)
- `.env.development` - Development-specific config (committed, no secrets)
- `.env.production` - Production-specific config (committed, no secrets)
- `.env.local` - Local overrides (gitignored, for your personal API keys)
- `.env.example` - Template file showing required variables

### Setup Instructions

1. **Copy the example file**:
   ```bash
   cp .env.example .env.local
   ```

2. **Add your API keys** to `.env.local`:
   ```env
   VITE_MAPBOX_SECRET_TOKEN=your_actual_secret_token
   VITE_MAPBOX_ACCESS_TOKEN=your_actual_access_token
   VITE_LOCATIONIQ_TOKEN=your_actual_locationiq_token
   ```

3. **The backend URL is automatically configured**:
   - Development mode (`pnpm dev`): Uses empty string → proxied to `localhost:3000`
   - Production mode (`pnpm build`): Uses `https://api.truthnuke.tech`

### How It Works

The backend URL is determined in `constants.ts`:
- Checks `VITE_API_BASE` environment variable first
- Falls back to auto-detection based on `import.meta.env.MODE`
- In development, uses relative URLs that Vite proxies to `localhost:3000`
- In production, uses the full hosted API URL

## Development

```bash
# Install dependencies
pnpm install

# Start development server (uses localhost:3000 backend)
pnpm dev

# Open http://localhost:5173
```

**Make sure the backend is running** on `localhost:3000` before starting the frontend dev server.

## Building for Production

```bash
# Build with production environment (uses hosted API)
pnpm build

# Preview production build locally
pnpm preview
```

## Project Structure

```
Frontend/
├── src/
│   ├── components/     # React components
│   ├── pages/          # Page components
│   ├── utils/          # Utility functions
│   └── types/          # TypeScript types
├── constants.ts        # App constants (including API URL config)
├── .env               # Base environment config
├── .env.development   # Development environment config
├── .env.production    # Production environment config
└── vite.config.ts     # Vite configuration with dev proxy
```

## Tech Stack

- **React 19** - UI framework
- **Vite 7** - Build tool and dev server
- **React Router 7** - Client-side routing
- **Mapbox GL** - Interactive maps
- **Tailwind CSS 4** - Styling
- **TypeScript** - Type safety

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build locally
- `pnpm lint` - Run ESLint (if configured)

## Notes

- API keys should NEVER be committed to git
- `.env.local` is gitignored to protect your personal tokens
- The Vite dev server proxy ensures CORS doesn't block local development
- Production builds use the hosted backend API directly
