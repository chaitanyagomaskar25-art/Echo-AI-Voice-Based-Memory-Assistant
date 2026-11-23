# Echo – AI Voice-Based Memory Assistant

Echo is a full-stack, voice-first personal memory assistant designed to capture, organize, search, and recall everyday thoughts, where you placed items, meeting recaps, book recommendations, and actionable tasks using natural language and speech processing.

---

## Architecture Overview

```
Echo – AI Voice-Based Memory Assistant/
├── backend/                       # Node.js + Express + MongoDB REST API
│   ├── .env                       # Environment configuration
│   ├── .env.example
│   ├── package.json
│   ├── server.js                  # Express application entry point
│   ├── start-db.sh                # Dedicated local MongoDB runner
│   ├── uploads/                   # Audio recordings storage
│   └── src/
│       ├── config/
│       │   └── db.js              # MongoDB Mongoose connection handler
│       ├── controllers/
│       │   ├── memoryController.js# CRUD, search, and memory management
│       │   ├── aiController.js    # "Ask Echo" conversational Q&A & enrichment
│       │   ├── audioController.js # Audio upload & transcription
│       │   ├── statsController.js # Cognitive memory analytics
│       │   └── tagController.js   # Tag catalog
│       ├── middleware/
│       │   ├── errorHandler.js    # Global centralized error handler
│       │   └── upload.js          # Multer audio upload middleware
│       ├── models/
│       │   ├── Memory.js          # Comprehensive memory schema with entities & reminders
│       │   └── Tag.js             # Categorized tag schema
│       ├── routes/
│       │   ├── memoryRoutes.js    # /api/memories routes
│       │   ├── aiRoutes.js        # /api/ai routes
│       │   ├── audioRoutes.js     # /api/audio routes
│       │   ├── statsRoutes.js     # /api/stats routes
│       │   └── tagRoutes.js       # /api/tags routes
│       ├── services/
│       │   ├── aiMemoryService.js # Entity extraction, categorization & Q&A synthesis
│       │   └── speechService.js   # Voice transcription engine
│       └── utils/
│           └── seedData.js        # Pre-seeded realistic voice memories
│
├── frontend/                      # React Native Mobile App (Expo SDK 51)
│   ├── .env                       # Mobile environment variables
│   ├── .env.example
│   ├── app.json                   # Expo mobile configuration & permissions
│   ├── babel.config.js            # Babel preset configuration
│   ├── package.json
│   ├── App.js                     # Root component with Redux & Navigation
│   ├── index.js                   # Expo root entry point
│   ├── assets/                    # Mobile app icons, splash screens
│   └── src/
│       ├── api/
│       │   ├── apiClient.js       # Axios client with interceptors
│       │   ├── memoryApi.js       # Memory API endpoints
│       │   ├── aiApi.js           # Ask Echo & enrichment API
│       │   └── statsApi.js        # Analytics & health API
│       ├── components/
│       │   ├── common/            # Button, Card, Input, Badge, Header, Spinner, EmptyState
│       │   ├── voice/             # AudioWaveformVisualizer, RecordButton, AudioPlayer
│       │   └── memory/            # MemoryCard, CategoryPill, EntityChips, SearchFilterBar
│       ├── config/
│       │   └── env.js             # Environment & runtime base URL resolver
│       ├── navigation/
│       │   ├── routes.js          # Navigation route constants
│       │   ├── BottomTabNavigator.js # 5 Mobile Tab screens
│       │   └── AppNavigator.js    # Native Stack Navigator
│       ├── screens/
│       │   ├── HomeScreen.js      # Quick capture hero, search bar, recent memos, stats
│       │   ├── VoiceRecordScreen.js # Live waveform, recording timer, auto-transcription preview
│       │   ├── MemoryListScreen.js# Searchable library, category pills, pinned toggle
│       │   ├── AskEchoScreen.js   # Conversational AI memory assistant with source citations
│       │   ├── MemoryDetailScreen.js # Audio playback, verbatim transcript, entity chips, reminders
│       │   ├── InsightsScreen.js  # Category distribution, emotional tone, pending reminders
│       │   └── SettingsScreen.js  # Backend API URL config, MongoDB health check, tech info
│       ├── store/
│       │   ├── index.js           # Redux Toolkit store
│       │   └── slices/            # memorySlice, aiSlice, audioSlice, uiSlice
│       ├── theme/
│       │   ├── colors.js          # Dark mode futuristic violet/indigo palette
│       │   ├── spacing.js         # Standard mobile layout spacing & border radii
│       │   ├── typography.js      # Type scale & font weights
│       │   └── index.js
│       └── utils/
│           ├── dateFormatter.js   # Relative time & duration formatters
│           └── helpers.js         # Category colors & icon helpers
│
└── start-dev.sh                   # One-click startup script for backend & mobile
```

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Mobile Frontend** | React Native, Expo (SDK 51), JavaScript (JSX) |
| **Navigation** | React Navigation (Bottom Tabs + Native Stack) |
| **State Management** | Redux Toolkit, React-Redux |
| **HTTP Client** | Axios (configured with interceptors & environment variables) |
| **Audio / Voice** | Expo AV (`expo-av`), Animated Waveform Visualizer |
| **Backend Server** | Node.js, Express.js |
| **Database** | MongoDB with Mongoose ODM |
| **AI / NLP Services** | AI Entity Extraction, Categorization, and Conversational Q&A ("Ask Echo") |

---

## Key Features

1. **Voice-First Memory Capture**:
   - One-tap audio recording with real-time animated waveform decibels.
   - Recording timer and simulated/real speech-to-text transcription preview.
   - Intelligent auto-categorization (Whereabouts, Tasks, Work, Ideas, People, Health, Personal).
   - Auto-detection of entities (Locations, Objects, People, Dates) and actionable reminders.

2. **Ask Echo – Conversational Memory Retrieval**:
   - Natural language Q&A: ask "Where is my passport?", "What did Sarah mention about the project?", or "What are my deadlines?".
   - Echo answers conversationally and cites exact source memories with snippets and timestamps.
   - One-tap navigation from citations directly to the source memory detail.

3. **Search & Memory Library**:
   - Real-time search across titles, verbatim transcripts, summaries, tags, and entities.
   - Category filter pills and pinned-only filter.
   - Pin important memories to the top of your dashboard.

4. **Cognitive Insights Dashboard**:
   - Visual breakdown of your thoughts across categories.
   - Emotional tone / sentiment analysis (positive, urgent, thoughtful, neutral).
   - Unified checklist of all pending actionable reminders across all voice notes with one-tap completion.

5. **Runtime Backend Configuration**:
   - Change backend URL dynamically from the in-app Settings screen (supports localhost, Android emulator `10.0.2.2:5000`, or local LAN IP for physical device testing).
   - Real-time MongoDB & Express connectivity status check.

---

## Running the Application

### 1. Start the Backend

```bash
# Start MongoDB daemon
./backend/start-db.sh

# Start the Express server
cd backend
npm run dev
```

The backend starts at `http://localhost:5000`.
- Health Check: `http://localhost:5000/api/health`
- Memories API: `http://localhost:5000/api/memories`

### 2. Start the Mobile Frontend

```bash
cd frontend
npx expo start
```

Press:
- `a` to launch in Android Emulator or Connected Device
- `i` to launch in iOS Simulator
- Scan the displayed QR code with the **Expo Go** app on your physical mobile device.

### 3. Or Use the One-Click Startup Script

```bash
./start-dev.sh
```

---

## API Reference

- `GET /api/health`: Backend server & database health check
- `GET /api/memories`: Retrieve filtered and paginated memories (`?category=`, `?search=`, `?isPinned=`)
- `POST /api/memories`: Create memory with automatic AI enrichment
- `GET /api/memories/:id`: Retrieve single memory with full entities and reminders
- `PATCH /api/memories/:id/pin`: Toggle pin status
- `PATCH /api/memories/:id/reminders/:reminderId/toggle`: Toggle reminder completion
- `DELETE /api/memories/:id`: Delete a memory
- `POST /api/ai/ask`: Conversational Q&A query ("Ask Echo")
- `POST /api/ai/enrich`: Preview AI metadata extraction for a transcript
- `GET /api/stats`: Cognitive memory analytics & pending reminders
