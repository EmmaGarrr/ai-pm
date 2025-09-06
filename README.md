# AI Project Manager (AI-PM)

A comprehensive AI-powered project management system with real-time collaboration, intelligent task management, and dual-output AI responses.

## 🚀 Features

- **Real-time Communication**: WebSocket-based real-time updates and chat
- **AI-Powered Assistance**: Intelligent project management with dual-output responses
- **Project Management**: Full CRUD operations for projects, tasks, and teams
- **Team Collaboration**: Real-time collaboration features with user presence
- **Memory System**: Persistent context-aware AI memory using Redis
- **Modern UI**: Responsive React/Next.js frontend with Tailwind CSS
- **WebSocket Integration**: Real-time updates and notifications
- **Error Handling**: Comprehensive error handling and recovery

## 🏗️ Architecture

### Frontend (Next.js 15 + React 19)
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **State Management**: React Context with useReducer
- **Styling**: Tailwind CSS + Radix UI components
- **Real-time**: Native WebSocket API
- **Testing**: Jest + React Testing Library

### Backend (FastAPI + Python)
- **Framework**: FastAPI with async support
- **Language**: Python 3.11+
- **Database**: Redis for memory and session management
- **Real-time**: FastAPI WebSocket + Socket.io
- **Authentication**: JWT-based authentication
- **Testing**: Pytest

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 18.0 or higher
- **Python**: Version 3.11 or higher
- **Redis**: Version 6.0 or higher
- **Git**: For version control
- **npm**: Package manager for Node.js
- **pip**: Package manager for Python

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/EmmaGarrr/ai-pm.git
cd ai-pm
```

### 2. Install Redis

#### macOS (using Homebrew):
```bash
brew install redis
brew services start redis
```

#### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

#### Windows:
```bash
# Using Chocolatey
choco install redis-64

# Or download from https://github.com/microsoftarchive/redis/releases
```

#### Verify Redis Installation:
```bash
redis-cli ping
# Should return: PONG
```

### 3. Backend Setup

#### Navigate to Backend Directory:
```bash
cd ai-pm-backend
```

#### Create Virtual Environment:
```bash
python -m venv venv

# Activate virtual environment
# macOS/Linux:
source venv/bin/activate

# Windows:
venv\Scripts\activate
```

#### Install Python Dependencies:
```bash
pip install -r requirements.txt
```

#### Create Environment File:
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=

# API Configuration
API_PORT=8000
API_HOST=0.0.0.0
CORS_ORIGINS=http://localhost:3000

# Environment
ENVIRONMENT=development
LOG_LEVEL=INFO

# System Configuration
MAX_MEMORY_ITEMS=1000
CONTEXT_WINDOW_SIZE=10
CONFIDENCE_THRESHOLD=0.85

# WebSocket Configuration
WEBSOCKET_ENABLED=true
WEBSOCKET_PORT=8001
WEBSOCKET_HOST=0.0.0.0
WEBSOCKET_SEPARATE_SERVER=false
```

#### Run Database Migrations (if any):
```bash
# Currently using Redis, no migrations needed
# Future database migrations will be added here
```

### 4. Frontend Setup

#### Navigate to Frontend Directory:
```bash
cd frontend
```

#### Install Node.js Dependencies:
```bash
npm install
```

#### Create Environment File:
```bash
cp .env.example .env.local
```

Edit `.env.local` file with your configuration:
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/api/websocket/ws

# Environment
NEXT_PUBLIC_ENVIRONMENT=development

# Error Reporting (Optional)
NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT=
```

### 5. Running the Application

#### Start Redis (if not already running):
```bash
# macOS/Linux
brew services start redis
# or
sudo systemctl start redis

# Windows
redis-server
```

#### Start Backend:
```bash
cd ai-pm-backend
source venv/bin/activate  # Activate virtual environment
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Start Frontend (in a separate terminal):
```bash
cd frontend
npm run dev
```

#### Access the Application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Backend Docs: http://localhost:8000/docs

## 🧪 Testing

### Backend Tests:
```bash
cd ai-pm-backend
source venv/bin/activate
pytest
```

### Frontend Tests:
```bash
cd frontend
npm test
```

### Test Coverage:
```bash
cd frontend
npm run test:coverage
```

## 📦 Deployment

### Environment Variables

#### Backend (.env):
```env
# Production settings
ENVIRONMENT=production
LOG_LEVEL=WARNING
API_HOST=0.0.0.0
API_PORT=8000

# Redis (Production)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=your-redis-password

# CORS (Production)
CORS_ORIGINS=https://your-domain.com
```

#### Frontend (.env.local):
```env
# Production settings
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_API_URL=https://your-api-domain.com
NEXT_PUBLIC_WS_URL=wss://your-api-domain.com/api/websocket/ws
```

### Docker Deployment (Coming Soon)

```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -am 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Submit a pull request

### Development Workflow

1. **Setup**: Follow the installation instructions above
2. **Development**: 
   - Make changes to your feature branch
   - Run tests locally: `npm test` (frontend) and `pytest` (backend)
   - Ensure linting passes: `npm run lint` (frontend)
3. **Documentation**: Update documentation as needed
4. **Pull Request**: Submit a detailed PR describing your changes

## 📝 Project Structure

```
ai-pm/
├── ai-pm-backend/                 # Backend application
│   ├── app/
│   │   ├── api/                   # API endpoints
│   │   ├── services/              # Business logic
│   │   ├── config/                # Configuration
│   │   ├── utils/                 # Utilities
│   │   └── main.py               # FastAPI app entry
│   ├── requirements.txt           # Python dependencies
│   ├── .env.example             # Environment template
│   └── tests/                   # Backend tests
├── frontend/                      # Frontend application
│   ├── src/
│   │   ├── app/                   # Next.js app router
│   │   ├── components/            # React components
│   │   ├── lib/                   # Utilities and services
│   │   └── store/                 # State management
│   ├── package.json              # Node.js dependencies
│   ├── .env.example              # Environment template
│   └── tests/                    # Frontend tests
├── README.md                     # This file
└── IMPLEMENTATION_PLAN.md        # Project implementation plan
```

## 🔧 Troubleshooting

### Common Issues

#### Redis Connection Issues
```bash
# Check if Redis is running
redis-cli ping

# If not running, start Redis
brew services start redis  # macOS
sudo systemctl start redis  # Linux
```

#### Port Already in Use
```bash
# Find process using port 8000
lsof -i :8000

# Kill the process
kill -9 <PID>
```

#### Python Virtual Environment Issues
```bash
# Recreate virtual environment
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### Node.js Dependencies Issues
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### WebSocket Connection Issues
1. Ensure backend is running on correct port (8000)
2. Check CORS settings in backend .env file
3. Verify WebSocket URL in frontend .env.local
4. Check Redis connection status

### Logs and Debugging

#### Backend Logs:
```bash
# Running with uvicorn shows logs automatically
# For more verbose logging:
export LOG_LEVEL=DEBUG
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend Logs:
```bash
# Check browser developer console
# Run with debug mode:
export NEXT_PUBLIC_DEBUG_MODE=true
npm run dev
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Next.js** - React framework for production
- **FastAPI** - Modern, fast web framework for building APIs
- **Redis** - In-memory data structure store
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Headless UI components
- **Socket.io** - Real-time bidirectional event-based communication

## 📞 Support

For support and questions:

1. Check the troubleshooting section above
2. Search existing issues on GitHub
3. Create a new issue with detailed description
4. Contact the development team

## 🎯 Current Status

This project is currently in **Phase 6: Integration & Testing**. The core functionality has been implemented and is undergoing integration testing.

### Completed Features:
- ✅ Frontend React components with modern UI
- ✅ Backend API with FastAPI
- ✅ WebSocket real-time communication
- ✅ Redis integration for memory management
- ✅ Authentication and authorization
- ✅ Error handling and recovery
- ✅ Comprehensive test suite

### In Progress:
- 🔄 AI response generation and dual output formatting
- 🔄 End-to-end integration testing
- 🔄 Performance optimization
- 🔄 Documentation and deployment setup

### Next Steps:
- 📋 AI integration with OpenAI/Anthropic APIs
- 📋 Advanced project management features
- 📋 Team collaboration tools
- 📋 Production deployment setup
- 📋 Mobile responsiveness optimization

---

**Happy coding! 🚀**