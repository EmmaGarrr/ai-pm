# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend (Next.js)
```bash
cd frontend
npm install          # Install dependencies
npm run dev          # Start development server (localhost:3000)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm test             # Run tests once
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

### Backend (FastAPI)
```bash
cd ai-pm-backend
python -m venv venv        # Create virtual environment
source venv/bin/activate   # Activate virtual environment (macOS/Linux)
pip install -r requirements.txt  # Install dependencies
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload  # Start development server
pytest                     # Run tests
pytest -v                  # Run tests with verbose output
```

### Testing
```bash
# Frontend tests
cd frontend
npm test
npm run test:coverage

# Backend tests
cd ai-pm-backend
pytest
```

## Architecture Overview

This is an AI-powered project management system with real-time collaboration features. The architecture consists of:

### Frontend (Next.js 15 + React 19)
- **Framework**: Next.js 15 with App Router
- **State Management**: React Context with useReducer
- **UI Components**: Radix UI + Tailwind CSS
- **Real-time**: WebSocket API for live updates
- **Testing**: Jest + React Testing Library

### Backend (FastAPI + Python)
- **Framework**: FastAPI with async support
- **Database**: Redis for memory and session management
- **Real-time**: WebSocket + Socket.io integration
- **AI Integration**: Gemini AI for intelligent responses
- **Testing**: Pytest with async support

### Key Services
- **Memory Service**: Redis-based context management
- **WebSocket Service**: Real-time communication
- **Broadcast Service**: Message broadcasting
- **Status Service**: System health monitoring
- **AI Service**: Gemini AI integration for dual-output responses

## Project Structure

```
ai-pm/
├── ai-pm-backend/                 # Backend application
│   ├── app/
│   │   ├── api/                   # API endpoints
│   │   │   ├── health.py          # Health check endpoints
│   │   │   ├── projects.py        # Project management APIs
│   │   │   ├── memory.py          # Memory management APIs
│   │   │   ├── chat.py            # Chat functionality
│   │   │   ├── ai.py              # AI response generation
│   │   │   └── websocket.py      # WebSocket endpoints
│   │   ├── services/              # Business logic
│   │   │   ├── redis_service.py   # Redis memory management
│   │   │   ├── websocket_service.py # WebSocket handling
│   │   │   ├── broadcast_service.py # Message broadcasting
│   │   │   └── status_service.py  # System health monitoring
│   │   ├── config/                # Configuration
│   │   │   ├── __init__.py        # Main settings
│   │   │   └── websocket.py       # WebSocket configuration
│   │   ├── models/                # Data models
│   │   │   ├── memory.py          # Memory models
│   │   │   ├── ai_response.py     # AI response models
│   │   │   ├── message.py         # Message models
│   │   │   └── project.py         # Project models
│   │   ├── utils/                 # Utilities
│   │   │   ├── logger.py          # Logging utilities
│   │   │   ├── error_handler.py   # Error handling
│   │   │   └── websocket_security.py # WebSocket security
│   │   ├── prompts/               # AI prompt templates
│   │   └── main.py               # FastAPI app entry point
│   ├── requirements.txt           # Python dependencies
│   ├── .env.example             # Environment template
│   └── tests/                   # Backend tests
├── frontend/                      # Frontend application
│   ├── src/
│   │   ├── app/                   # Next.js app router
│   │   │   ├── page.tsx          # Main landing page
│   │   │   ├── layout.tsx        # Root layout
│   │   │   └── project/          # Project-specific pages
│   │   ├── components/            # React components
│   │   │   ├── ui/               # UI components (Radix UI)
│   │   │   └── NotificationCenter.tsx # Notification system
│   │   ├── lib/                   # Utilities and services
│   │   │   ├── websocket-client.js # WebSocket client
│   │   │   └── api-client.js      # API client
│   │   └── store/                 # State management
│   ├── package.json              # Node.js dependencies
│   ├── .env.local               # Frontend environment variables
│   ├── jest.config.js           # Jest configuration
│   └── tests/                   # Frontend tests
└── README.md                    # Project documentation
```

## Environment Configuration

### Backend (.env)
- **Redis**: REDIS_HOST, REDIS_PORT, REDIS_DB, REDIS_PASSWORD
- **API**: API_PORT, API_HOST, CORS_ORIGINS
- **AI**: GEMINI_API_KEY, GEMINI_MODEL, AI_TEMPERATURE, AI_MAX_TOKENS
- **WebSocket**: WEBSOCKET_ENABLED, WEBSOCKET_PORT, WEBSOCKET_HOST
- **System**: ENVIRONMENT, LOG_LEVEL, MAX_MEMORY_ITEMS

### Frontend (.env.local)
- **API**: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL
- **Environment**: NEXT_PUBLIC_ENVIRONMENT
- **Error Reporting**: NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT

## Key Features

### Real-time Communication
- WebSocket-based real-time updates
- Chat functionality with broadcasting
- User presence indicators
- Live project status updates

### AI-Powered Features
- Dual-output AI responses (user-friendly + technical)
- Context-aware memory system
- Intelligent project management suggestions
- Automated task analysis

### Project Management
- Full CRUD operations for projects and tasks
- Team collaboration features
- Progress tracking and reporting
- Memory-based context preservation

## Development Workflow

1. **Setup**: Follow installation instructions in README.md
2. **Development**: 
   - Start Redis server
   - Start backend (FastAPI)
   - Start frontend (Next.js)
   - Make changes to respective components
3. **Testing**: Run tests for both frontend and backend
4. **Integration**: Test WebSocket connections and AI responses

## Common Issues

### Redis Connection
- Ensure Redis is running before starting backend
- Check Redis connection settings in .env
- Use `redis-cli ping` to verify Redis is running

### WebSocket Connections
- Verify backend is running on correct port (8000)
- Check CORS settings in backend .env
- Ensure WebSocket URL in frontend .env.local is correct

### AI Integration
- Ensure GEMINI_API_KEY is set in backend .env
- Verify AI model configuration
- Check AI response formatting and dual-output functionality

## Testing Notes

- Frontend tests use Jest with React Testing Library
- Backend tests use Pytest with async support
- Integration tests should verify WebSocket connections
- AI response testing should validate both user-friendly and technical outputs