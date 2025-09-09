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

### Frontend (Next.js 15.5.2 + React 19.1.1)
- **Framework**: Next.js 15.5.2 with App Router
- **State Management**: React Context with useReducer
- **UI Components**: Radix UI + Tailwind CSS + Shadcn/ui
- **Real-time**: WebSocket API for live updates
- **Testing**: Jest + React Testing Library
- **Performance**: Code splitting, lazy loading, caching strategies
- **Accessibility**: Built-in accessibility components

### Backend (FastAPI 0.115.5 + Python 3.9)
- **Framework**: FastAPI 0.115.5 with async support
- **Database**: Redis 5.2.1 for memory and session management
- **Real-time**: WebSocket + Socket.io integration
- **AI Integration**: Google Gemini AI with verification loop
- **Testing**: Pytest with async support
- **Logging**: Structured logging with comprehensive error handling

### Key Services
- **Memory Service**: Redis-based context management with metadata tracking
- **WebSocket Service**: Socket.io integration with event-driven architecture
- **Broadcast Service**: Message broadcasting with connection management
- **Status Service**: System health monitoring with real-time metrics
- **AI Service**: Gemini AI integration with dual-output responses and confidence scoring
- **Context Engine**: Advanced context analysis and memory management
- **Connection Manager**: WebSocket connection lifecycle management
- **Chat Processor**: Advanced chat processing with verification loop and adaptive workflow management

## Project Structure

```
ai-pm/
├── ai-pm-backend/                 # Backend FastAPI application
│   ├── app/
│   │   ├── api/                   # API endpoints
│   │   │   ├── ai.py              # AI response generation
│   │   │   ├── chat.py            # Chat functionality
│   │   │   ├── health.py          # Health check endpoints
│   │   │   ├── memory.py          # Memory management APIs
│   │   │   ├── projects.py        # Project management APIs
│   │   │   └── websocket.py      # WebSocket endpoints
│   │   ├── config/                # Configuration
│   │   │   ├── __init__.py        # Main settings
│   │   │   └── websocket.py       # WebSocket configuration
│   │   ├── events/                # Event handling
│   │   │   ├── __init__.py
│   │   │   └── websocket_events.py # WebSocket event definitions
│   │   ├── models/                # Data models
│   │   │   ├── ai_response.py     # AI response models
│   │   │   ├── memory.py          # Memory models
│   │   │   ├── message.py         # Message models
│   │   │   └── project.py         # Project models
│   │   ├── prompts/               # AI prompt templates
│   │   │   ├── ai_pm_system.txt   # Main AI system prompt
│   │   │   ├── technical_instruction.txt # Technical instruction prompt
│   │   │   ├── user_explanation.txt # User explanation prompt
│   │   │   └── verification_prompt.txt # Verification prompt
│   │   ├── services/              # Business logic
│   │   │   ├── base_ai_service.py  # Base AI service
│   │   │   ├── base_service.py    # Base service class
│   │   │   ├── broadcast_service.py # Message broadcasting
│   │   │   ├── chat_processor.py  # Advanced chat processing
│   │   │   ├── connection_manager.py # WebSocket connection management
│   │   │   ├── context_engine.py  # Context analysis and memory
│   │   │   ├── gemini_service.py  # Google Gemini AI integration
│   │   │   ├── redis_service.py   # Redis memory management
│   │   │   ├── status_service.py  # System health monitoring
│   │   │   └── websocket_service.py # WebSocket handling
│   │   ├── utils/                 # Utilities
│   │   │   ├── error_handler.py   # Error handling
│   │   │   ├── logger.py          # Logging utilities
│   │   │   └── websocket_security.py # WebSocket security
│   │   ├── main.py                # FastAPI app entry point
│   │   └── settings.py            # Application settings
│   ├── requirements.txt           # Python dependencies
│   ├── .env                       # Environment variables
│   ├── .env.example             # Environment template
│   ├── backend.log              # Backend logs
│   └── tests/                   # Backend tests
├── frontend/                      # Frontend Next.js application
│   ├── src/
│   │   ├── app/                   # Next.js app router
│   │   │   ├── globals.css        # Global styles
│   │   │   ├── layout.tsx          # Root layout
│   │   │   ├── page.tsx            # Main landing page
│   │   │   ├── project/            # Project-specific pages
│   │   │   │   └── [id]/           # Dynamic project pages
│   │   │   │       └── page.tsx
│   │   │   └── favicon.ico        # Favicon
│   │   ├── components/            # React components
│   │   │   ├── chat/               # Chat-related components
│   │   │   │   ├── ConfidenceIndicator.tsx
│   │   │   │   ├── DualOutputContainer.tsx
│   │   │   │   ├── MessageActions.tsx
│   │   │   │   ├── TechnicalInstructionsBox.tsx
│   │   │   │   ├── TypingIndicator.tsx
│   │   │   │   └── UserExplanationBox.tsx
│   │   │   ├── dependency/         # Dependency visualization
│   │   │   ├── memory/             # Memory management
│   │   │   ├── session/            # Session management
│   │   │   ├── status/             # Status monitoring
│   │   │   ├── ui/                 # UI components (Radix UI + Shadcn/ui)
│   │   │   │   ├── Accessibility.tsx
│   │   │   │   ├── NotificationCenter.tsx
│   │   │   │   ├── ThemeProvider.tsx
│   │   │   │   └── [50+ UI components]
│   │   │   ├── chat-history.tsx    # Chat history component
│   │   │   ├── chat-interface.tsx  # Chat interface
│   │   │   ├── chat-message.tsx    # Chat message component
│   │   │   ├── context-sidebar.tsx  # Context sidebar
│   │   │   ├── create-project-dialog.tsx # Project creation dialog
│   │   │   ├── error-boundary.tsx   # Error boundary
│   │   │   ├── header.tsx           # Header component
│   │   │   ├── project-card.tsx     # Project card
│   │   │   └── sidebar.tsx          # Sidebar
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── lib/                   # Utilities and services
│   │   │   ├── api/                # API client
│   │   │   │   ├── authService.ts
│   │   │   │   ├── chatService.ts
│   │   │   │   ├── client.ts
│   │   │   │   └── projectService.ts
│   │   │   ├── cache/              # Caching utilities
│   │   │   │   ├── AdvancedCache.ts
│   │   │   │   └── cacheManager.ts
│   │   │   ├── error/              # Error handling
│   │   │   │   └── errorHandler.ts
│   │   │   ├── store/              # State management
│   │   │   │   ├── appContext.tsx
│   │   │   │   └── index.ts
│   │   │   ├── types/              # TypeScript types
│   │   │   │   └── index.ts
│   │   │   ├── utils/              # Utility functions
│   │   │   │   ├── codeSplitting.ts
│   │   │   │   ├── OfflineSupport.ts
│   │   │   │   ├── performance.ts
│   │   │   │   ├── SystemUtilities.ts
│   │   │   │   └── utils.ts
│   │   │   └── websocket/          # WebSocket client
│   │   │       ├── client.ts
│   │   │       └── eventHandlers.ts
│   │   └── __tests__/              # Test files
│   ├── public/                    # Static assets
│   ├── package.json               # Node.js dependencies
│   ├── jest.config.js             # Jest configuration
│   ├── next.config.ts             # Next.js configuration
│   ├── tailwind.config.ts         # Tailwind CSS configuration
│   ├── tsconfig.json              # TypeScript configuration
│   └── components.json            # Shadcn/ui configuration
├── .git/                         # Git repository
├── .claude/                      # Claude configuration
├── CLAUDE.md                     # Project documentation
├── README.md                     # General README
├── PRD.md                        # Product Requirements Document
├── IMPLEMENTATION_PLAN.md        # Implementation plan
├── UNIFIED_CHAT_STORAGE_PRD.md  # Unified chat PRD
├── main-focus                    # Current focus file
└── .gitignore                    # Git ignore rules
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
- WebSocket-based real-time updates with Socket.io integration
- Chat functionality with broadcasting and connection management
- Event-driven architecture with structured event handling
- User presence indicators and live project status updates

### AI-Powered Features
- Dual-output AI responses (user-friendly + technical) with confidence scoring
- Advanced AI verification loop for response validation
- Context-aware memory system with metadata tracking
- Intelligent project management suggestions and automated task analysis
- Multiple specialized AI prompts for different response types
- Adaptive workflow management for multi-cycle analysis with progressive depth tracking
- Workflow state persistence using Redis infrastructure with 30-day TTL

### Project Management
- Full CRUD operations for projects and tasks
- Team collaboration features with session management
- Progress tracking and reporting with real-time metrics
- Memory-based context preservation with advanced caching
- Dependency visualization and project analytics

### Performance & Accessibility
- Code splitting and lazy loading for optimal performance
- Advanced caching strategies with cache management
- Built-in accessibility components and ARIA compliance
- Offline support and performance monitoring
- Structured error handling and recovery

### Developer Experience
- Comprehensive testing coverage (Jest + React Testing Library + Pytest)
- Structured logging with detailed error tracking
- Hot reload development environment
- TypeScript for type safety
- Modern toolchain with Next.js 15.5.2 and React 19.1.1

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
- Ensure Redis 5.2.1 is running before starting backend
- Check Redis connection settings in .env (REDIS_HOST, REDIS_PORT, REDIS_DB, REDIS_PASSWORD)
- Use `redis-cli ping` to verify Redis is running
- Verify Redis memory limits and connection pooling settings

### WebSocket Connections
- Verify backend is running on correct port (8000)
- Check CORS settings in backend .env (CORS_ORIGINS)
- Ensure WebSocket URL in frontend .env.local is correct (NEXT_PUBLIC_WS_URL)
- Verify Socket.io integration and event handling configuration

### AI Integration
- Ensure GEMINI_API_KEY is set in backend .env
- Verify AI model configuration (GEMINI_MODEL, AI_TEMPERATURE, AI_MAX_TOKENS)
- Check AI response formatting and dual-output functionality
- Monitor confidence scoring and verification loop performance
- Verify prompt templates are correctly configured
- Test adaptive workflow management with progressive analysis depth (0-4 levels)
- Verify workflow state persistence and advancement logic

### Performance Issues
- Monitor memory usage and Redis connection limits
- Check frontend bundle size and code splitting effectiveness
- Verify caching strategies are working properly
- Monitor WebSocket connection count and cleanup

### Error Handling
- Check structured logging in backend.log
- Verify error boundary components in frontend
- Monitor API response times and error rates
- Check WebSocket event handling and reconnection logic

## Testing Notes

### Frontend Testing
- **Framework**: Jest with React Testing Library
- **Coverage**: Comprehensive test coverage for all components and utilities
- **Types**: Unit tests, integration tests, component tests
- **Features**: 
  - Component rendering and user interaction testing
  - State management and context testing
  - API client and WebSocket integration testing
  - Accessibility testing with ARIA compliance
  - Performance and caching utility testing
- **Commands**: 
  - `npm test` - Run all tests
  - `npm run test:watch` - Run tests in watch mode
  - `npm run test:coverage` - Run tests with coverage report

### Backend Testing
- **Framework**: Pytest with async support
- **Coverage**: Comprehensive test coverage for all services and API endpoints
- **Types**: Unit tests, integration tests, API endpoint tests
- **Features**:
  - Service layer testing with Redis integration
  - API endpoint testing with FastAPI test client
  - WebSocket event handling testing
  - AI response generation and verification testing
  - Error handling and logging testing
  - Adaptive workflow management testing with state persistence validation
- **Commands**:
  - `pytest` - Run all tests
  - `pytest -v` - Run tests with verbose output
  - `pytest --cov=app` - Run tests with coverage report

### Integration Testing
- **WebSocket Connections**: Verify real-time communication and event handling
- **API Integration**: Test frontend-backend API communication
- **AI Response Testing**: Validate both user-friendly and technical outputs
- **Memory Management**: Test Redis-based context preservation and retrieval
- **Error Scenarios**: Test error handling and recovery mechanisms
- **Performance Testing**: Monitor response times and resource usage

### Test Configuration
- **Frontend**: jest.config.js with TypeScript and React testing configuration
- **Backend**: pytest.ini with async support and coverage settings
- **Environment**: Test-specific environment variables and mock configurations
- **CI/CD**: Automated testing on code changes with coverage requirements