# Whale Class - Learning Videos Platform

A Next.js platform designed for the Whale Class kindergarten to share weekly songs and phonics videos with parents. The platform features a mobile-friendly PWA (Progressive Web App) that can be installed like a native app.

## Features

- 🐋 **Whale-themed Design**: Beautiful, kid-friendly interface with ocean and whale aesthetics
- 📱 **PWA Support**: Installable on mobile devices for app-like experience
- 🎵 **Song of the Week**: Weekly song uploads for children to learn
- 📚 **Phonics Songs**: Educational phonics videos
- 🔐 **Admin Portal**: Secure admin access to upload and manage videos
- 📱 **Mobile Responsive**: Optimized for mobile devices

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env.local` file in the root directory:
```
ADMIN_SECRET=your-secret-key-here
ADMIN_PASSWORD=your-admin-password-here
```

3. Create necessary directories:
```bash
mkdir -p public/videos data
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### For Parents

1. Visit the website on your mobile device
2. Browse videos by category (All Videos, Song of Week, Phonics Songs)
3. Tap "Install" when prompted to add the app to your home screen
4. Enjoy easy access to learning videos!

### For Admin

1. Navigate to `/admin/login`
2. Enter your admin password
3. Upload videos by clicking "+ Upload New Video"
4. Fill in the form:
   - Title: Name of the video
   - Category: Choose "Song of the Week" or "Phonics Song"
   - Week: Optional week identifier (e.g., "Week 1")
   - Video File: Select your video file
5. Click "Upload Video"
6. Manage videos by viewing them in the dashboard and deleting if needed

## Project Structure

```
whale/
├── app/
│   ├── admin/
│   │   ├── login/        # Admin login page
│   │   └── page.tsx      # Admin dashboard
│   ├── api/
│   │   ├── auth/         # Authentication endpoints
│   │   ├── videos/       # Video management endpoints
│   │   └── public/       # Public API endpoints
│   ├── layout.tsx        # Root layout with PWA metadata
│   └── page.tsx          # Home page (parent-facing)
├── lib/
│   ├── auth.ts           # Authentication utilities
│   └── data.ts           # Data storage utilities
├── public/
│   ├── videos/           # Video storage directory
│   └── manifest.json     # PWA manifest
└── data/
    └── videos.json       # Video metadata storage
```

## PWA Installation

### iOS (Safari)
1. Open the website in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. The app will appear on your home screen

### Android (Chrome)
1. Open the website in Chrome
2. Tap the menu (three dots)
3. Select "Add to Home Screen" or "Install App"
4. The app will be installed

## Security Notes

- Change the `ADMIN_SECRET` and `ADMIN_PASSWORD` in production
- Videos are stored in the `public/videos` directory
- Consider using cloud storage (AWS S3, Cloudinary) for production
- Implement proper authentication for production use

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

3. For cloud deployment (Vercel, Netlify, etc.):
   - Connect your repository
   - Set environment variables
   - Deploy!

## Customization

- Colors: Edit `app/globals.css` to change the whale theme colors
- Logo: Replace the emoji whale (🐋) with your own logo
- Icons: Add custom PWA icons (192x192 and 512x512) to `public/`

## License

Private project for Whale Class kindergarten.
