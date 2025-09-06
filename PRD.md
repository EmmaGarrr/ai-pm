# **Product Requirements Document (PRD)**
## **AI Project Manager System**
*Version 1.0 - December 2024*

---

## **Executive Summary**

Build an intelligent chat system that acts as a Project Manager between a non-technical user and an AI Developer. The system maintains context, ensures understanding through iterative questioning, and never loses project knowledge.

---

## **Technical Stack & Dependencies**

### **Frontend Stack**
```json
{
  "next": "15.1.0",
  "react": "19.0.0",
  "tailwindcss": "3.4.1",
  "typescript": "5.6.3",
  "@radix-ui/react-dialog": "1.1.3",
  "@radix-ui/react-select": "2.1.3",
  "react-markdown": "9.0.1",
  "lucide-react": "0.456.0",
  "zustand": "5.0.1",
  "axios": "1.7.9",
  "socket.io-client": "4.8.1",
  "react-hot-toast": "2.4.1"
}
```

### **Backend Stack**
```json
{
  "fastapi": "0.115.5",
  "redis": "5.2.1",
  "google-generativeai": "0.8.3",
  "pydantic": "2.10.3",
  "python-socketio": "5.12.0",
  "uvicorn": "0.32.1",
  "python-multipart": "0.0.19",
  "python-dotenv": "1.0.1"
}
```

### **Development Tools**
```bash
# Required installations
Node.js: v20.18.0 LTS
Python: 3.11+
Redis: 7.4.1
pnpm: 9.15.0 (preferred) or npm
```

---

## **Phase 1: Foundation (Week 1)**

### **1.1 Project Setup**# **Product Requirements Document (PRD)**
## **AI Project Manager System - Complete Development Guide**
*Version 1.0 - December 2024*

---

## **Executive Summary**

Build an intelligent chat system that acts as a Project Manager between a non-technical user and an AI Developer. The system uses Next.js 15 with React 19 support, Gemini API for intelligence, and Redis for persistent memory management.

---

## **Part 1: Technical Stack & Setup**

### **Frontend Stack (Next.js 15 + Tailwind)**

```json
{
  "dependencies": {
    "next": "15.1.0",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "tailwindcss": "3.4.1",
    "typescript": "5.6.3",
    "@radix-ui/react-dialog": "1.1.3",
    "@radix-ui/react-dropdown-menu": "2.1.3",
    "@radix-ui/react-tabs": "1.1.1",
    "lucide-react": "0.456.0",
    "zustand": "5.0.1",
    "axios": "1.7.9",
    "socket.io-client": "4.8.1",
    "react-markdown": "9.0.1",
    "react-hot-toast": "2.4.1",
    "framer-motion": "11.15.0",
    "date-fns": "4.1.0"
  }
}
```

### **Backend Stack (FastAPI + Redis + Gemini)**

```txt
# requirements.txt
fastapi==0.115.5
uvicorn[standard]==0.32.1
redis==5.2.1
google-genai==0.8.3
pydantic==2.10.3
python-socketio==5.12.0
python-multipart==0.0.19
python-dotenv==1.0.1
httpx==0.28.1
```

### **Initial Project Setup Instructions**

```bash
# Frontend Setup
npx create-next-app@latest ai-pm-frontend --typescript --tailwind --app --src-dir
# Select Yes for ESLint, Yes for App Router

# Backend Setup
mkdir ai-pm-backend
cd ai-pm-backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

---

## **Phase 1: Foundation & Architecture (Days 1-3)**

### **1.1 Project Structure Creation**

**Frontend Structure:**
```
src/
├── app/
│   ├── api/
│   │   └── socket/
│   │       └── route.ts
│   ├── projects/
│   │   └── [projectId]/
│   │       └── page.tsx
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── chat/
│   │   ├── ChatArea.tsx
│   │   ├── MessageItem.tsx
│   │   ├── InstructionBox.tsx
│   │   └── SummaryBox.tsx
│   ├── sidebar/
│   │   ├── ProjectList.tsx
│   │   ├── ChatHistory.tsx
│   │   └── NewProjectDialog.tsx
│   ├── status/
│   │   └── LiveStatus.tsx
│   └── ui/
│       ├── Button.tsx
│       └── Dialog.tsx
├── lib/
│   ├── api/
│   │   └── client.ts
│   ├── store/
│   │   └── useStore.ts
│   └── types/
│       └── index.ts
└── utils/
    └── helpers.ts
```

**Backend Structure:**
```
ai-pm-backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── message.py
│   │   └── project.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── gemini_service.py
│   │   ├── redis_service.py
│   │   └── context_engine.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── chat.py
│   │   ├── projects.py
│   │   └── websocket.py
│   └── prompts/
│       ├── __init__.py
│       └── system_prompts.py
├── tests/
├── .env
└── requirements.txt
```

### **1.2 Core Type Definitions**

**Frontend Types (lib/types/index.ts):**
```typescript
export interface Project {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface Message {
  id: string;
  projectId: string;
  role: 'user' | 'ai_pm' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    forDeveloper?: boolean;
    instruction?: string;
    summary?: string;
    confidence?: number;
  };
}

export interface MemoryItem {
  key: string;
  value: any;
  type: 'error' | 'solution' | 'context' | 'dependency';
  timestamp: Date;
  relevance?: number;
}

export interface LiveStatus {
  currentAction: string;
  memoryCount: number;
  contextItems: string[];
  confidence: number;
  lastSuccess?: string;
}
```

**Backend Models (app/models/message.py):**
```python
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any, Literal
from enum import Enum

class MessageRole(str, Enum):
    USER = "user"
    AI_PM = "ai_pm"
    SYSTEM = "system"

class MessageMetadata(BaseModel):
    for_developer: Optional[bool] = False
    instruction: Optional[str] = None
    summary: Optional[str] = None
    confidence: Optional[float] = None

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    project_id: str
    role: MessageRole
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[MessageMetadata] = None

class MemoryItem(BaseModel):
    key: str
    value: Any
    type: Literal['error', 'solution', 'context', 'dependency']
    timestamp: datetime
    relevance: Optional[float] = None
```

### **1.3 Environment Configuration**

**.env file (Backend):**
```env
# Gemini API
GEMINI_API_KEY=your-api-key-here

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=

# API Configuration
API_PORT=8000
API_HOST=0.0.0.0
CORS_ORIGINS=http://localhost:3000

# System Configuration
MAX_MEMORY_ITEMS=1000
CONTEXT_WINDOW_SIZE=10
CONFIDENCE_THRESHOLD=0.85
```

**.env.local (Frontend):**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

---

## **Phase 2: Core Services Implementation (Days 4-7)**

### **2.1 Gemini Service Setup**

**app/services/gemini_service.py:**
```python
from google import genai
from google.genai import types
import os
from typing import Dict, Any, Optional
import logging

class GeminiService:
    def __init__(self):
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found")
        
        self.client = genai.Client(api_key=api_key)
        self.model = "gemini-2.0-flash-001"
        self.logger = logging.getLogger(__name__)
        
    async def generate_analysis_prompt(
        self, 
        error: str, 
        context: Dict[str, Any]
    ) -> Dict[str, str]:
        """Generate analysis instructions for AI Developer"""
        
        system_prompt = self._get_system_prompt()
        
        config = types.GenerateContentConfig(
            temperature=0.3,
            max_output_tokens=2000,
            system_instruction=system_prompt
        )
        
        prompt = f"""
        Error received: {error}
        
        Project context: {context}
        
        Generate:
        1. Technical analysis instructions for AI Developer
        2. Simple explanation for non-technical user (10-15 sentences)
        """
        
        response = await self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=config
        )
        
        return self._parse_response(response)
    
    def _get_system_prompt(self) -> str:
        return """You are an AI Project Manager. Your role:
        1. NEVER provide solutions without complete understanding
        2. Create detailed analysis instructions for developers
        3. Provide simple explanations for non-technical users
        4. Demand line-by-line verification
        5. Store and recall all important information
        """
```

### **2.2 Redis Memory Service**

**app/services/redis_service.py:**
```python
import redis.asyncio as redis
import json
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
import hashlib

class RedisMemoryService:
    def __init__(self):
        self.redis = None
        self.ttl = 86400 * 30  # 30 days
        
    async def connect(self):
        """Initialize Redis connection"""
        self.redis = redis.Redis(
            host=os.getenv('REDIS_HOST', 'localhost'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            db=int(os.getenv('REDIS_DB', 0)),
            decode_responses=True
        )
        await self.redis.ping()
        
    async def store_memory(
        self, 
        project_id: str, 
        key: str, 
        value: Any,
        memory_type: str
    ) -> bool:
        """Store memory item with intelligent indexing"""
        
        # Create composite key
        memory_key = f"project:{project_id}:memory:{memory_type}:{key}"
        
        # Store the value
        data = {
            "value": value,
            "type": memory_type,
            "timestamp": datetime.utcnow().isoformat(),
            "hash": hashlib.md5(str(value).encode()).hexdigest()
        }
        
        await self.redis.setex(
            memory_key,
            self.ttl,
            json.dumps(data)
        )
        
        # Update indices
        await self._update_indices(project_id, key, memory_type)
        
        return True
    
    async def recall_memory(
        self, 
        project_id: str, 
        query: str,
        memory_types: List[str] = None
    ) -> List[Dict[str, Any]]:
        """Intelligent memory recall based on context"""
        
        if memory_types is None:
            memory_types = ['error', 'solution', 'context', 'dependency']
        
        results = []
        
        for memory_type in memory_types:
            pattern = f"project:{project_id}:memory:{memory_type}:*{query}*"
            keys = await self.redis.keys(pattern)
            
            for key in keys[:10]:  # Limit results
                data = await self.redis.get(key)
                if data:
                    results.append(json.loads(data))
        
        # Sort by relevance and timestamp
        results.sort(
            key=lambda x: x.get('timestamp', ''), 
            reverse=True
        )
        
        return results
```

### **2.3 Context Engine**

**app/services/context_engine.py:**
```python
from typing import Dict, List, Any, Optional
import re

class ContextEngine:
    def __init__(self, redis_service: RedisMemoryService):
        self.redis = redis_service
        self.dependency_map = {}
        self.critical_zones = set()
        
    async def analyze_context(
        self, 
        project_id: str, 
        current_issue: str
    ) -> Dict[str, Any]:
        """Analyze and build context for current issue"""
        
        # Search for similar past issues
        past_issues = await self.redis.recall_memory(
            project_id, 
            current_issue, 
            ['error']
        )
        
        # Get related solutions
        solutions = []
        for issue in past_issues[:5]:
            related_solutions = await self.redis.recall_memory(
                project_id,
                issue.get('value', ''),
                ['solution']
            )
            solutions.extend(related_solutions)
        
        # Build dependency context
        dependencies = await self._get_dependencies(project_id, current_issue)
        
        return {
            "similar_issues": past_issues,
            "past_solutions": solutions,
            "dependencies": dependencies,
            "confidence": self._calculate_confidence(past_issues, solutions)
        }
    
    async def verify_no_regression(
        self, 
        project_id: str, 
        proposed_changes: Dict
    ) -> Dict[str, Any]:
        """Ensure proposed changes won't break existing functionality"""
        
        affected_files = proposed_changes.get('files', [])
        
        # Check critical zones
        violations = []
        for file in affected_files:
            if file in self.critical_zones:
                violations.append(f"Critical file: {file}")
        
        # Check dependencies
        affected_deps = []
        for file in affected_files:
            deps = self.dependency_map.get(file, [])
            affected_deps.extend(deps)
        
        return {
            "safe": len(violations) == 0,
            "violations": violations,
            "affected_dependencies": list(set(affected_deps)),
            "recommendation": "Safe to proceed" if not violations else "Review required"
        }
```

---

## **Phase 3: Frontend Implementation (Days 8-11)**

### **3.1 Main Layout Component**

**app/layout.tsx:**
```typescript
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from '@/components/providers/Providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'AI Project Manager',
  description: 'Intelligent project management between you and AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="flex h-screen bg-gray-50">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}
```

### **3.2 Chat Interface Component**

**components/chat/ChatArea.tsx:**
```typescript
'use client'

import { useState, useEffect, useRef } from 'react'
import MessageItem from './MessageItem'
import InstructionBox from './InstructionBox'
import SummaryBox from './SummaryBox'
import { useStore } from '@/lib/store/useStore'
import { Button } from '@/components/ui/Button'
import { Send, Loader2 } from 'lucide-react'

export default function ChatArea({ projectId }: { projectId: string }) {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const { messages, sendMessage, deleteMessage } = useStore()
  
  const projectMessages = messages.filter(m => m.projectId === projectId)
  
  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    
    setIsLoading(true)
    await sendMessage(projectId, input)
    setInput('')
    setIsLoading(false)
  }
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [projectMessages])
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {projectMessages.map((message) => (
          <div key={message.id} className="space-y-2">
            <MessageItem 
              message={message}
              onDelete={() => deleteMessage(message.id)}
            />
            
            {message.metadata?.summary && (
              <SummaryBox content={message.metadata.summary} />
            )}
            
            {message.metadata?.instruction && (
              <InstructionBox 
                content={message.metadata.instruction}
                forDeveloper={message.metadata.forDeveloper}
              />
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="border-t bg-white p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Describe your issue or paste error..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <Button 
            onClick={handleSend} 
            disabled={isLoading}
            className="px-6"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### **3.3 Zustand Store**

**lib/store/useStore.ts:**
```typescript
import { create } from 'zustand'
import { Message, Project, LiveStatus } from '@/lib/types'
import api from '@/lib/api/client'

interface StoreState {
  projects: Project[]
  currentProject: Project | null
  messages: Message[]
  liveStatus: LiveStatus | null
  
  // Actions
  createProject: (name: string) => Promise<Project>
  selectProject: (projectId: string) => void
  sendMessage: (projectId: string, content: string) => Promise<void>
  deleteMessage: (messageId: string) => Promise<void>
  updateLiveStatus: (status: LiveStatus) => void
  loadProjectHistory: (projectId: string) => Promise<void>
}

export const useStore = create<StoreState>((set, get) => ({
  projects: [],
  currentProject: null,
  messages: [],
  liveStatus: null,
  
  createProject: async (name: string) => {
    const project = await api.post('/projects', { name })
    set((state) => ({
      projects: [...state.projects, project.data]
    }))
    return project.data
  },
  
  selectProject: (projectId: string) => {
    const project = get().projects.find(p => p.id === projectId)
    set({ currentProject: project })
    get().loadProjectHistory(projectId)
  },
  
  sendMessage: async (projectId: string, content: string) => {
    const response = await api.post('/chat', {
      project_id: projectId,
      content
    })
    
    set((state) => ({
      messages: [...state.messages, response.data]
    }))
  },
  
  deleteMessage: async (messageId: string) => {
    await api.delete(`/messages/${messageId}`)
    set((state) => ({
      messages: state.messages.filter(m => m.id !== messageId)
    }))
  },
  
  updateLiveStatus: (status: LiveStatus) => {
    set({ liveStatus: status })
  },
  
  loadProjectHistory: async (projectId: string) => {
    const response = await api.get(`/projects/${projectId}/messages`)
    set({ messages: response.data })
  }
}))
```

---

## **Phase 4: API & WebSocket Integration (Days 12-14)**

### **4.1 FastAPI Main Application**

**app/main.py:**
```python
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import socketio
from app.services.redis_service import RedisMemoryService
from app.services.gemini_service import GeminiService
from app.api import chat, projects, websocket
import os

# Initialize services
redis_service = RedisMemoryService()
gemini_service = GeminiService()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await redis_service.connect()
    yield
    # Shutdown
    await redis_service.close()

app = FastAPI(lifespan=lifespan)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv('CORS_ORIGINS', '').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Socket.IO setup
sio = socketio.AsyncServer(
    cors_allowed_origins='*',
    async_mode='asgi'
)
socket_app = socketio.ASGIApp(sio, app)

# Include routers
app.include_router(chat.router, prefix="/api/chat")
app.include_router(projects.router, prefix="/api/projects")

# Dependency injection
app.state.redis = redis_service
app.state.gemini = gemini_service
app.state.sio = sio
```

### **4.2 Chat API Endpoints**

**app/api/chat.py:**
```python
from fastapi import APIRouter, HTTPException, Request
from app.models.message import Message
from app.services.context_engine import ContextEngine
from typing import Dict, Any
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/")
async def process_message(
    request: Request,
    project_id: str,
    content: str
) -> Dict[str, Any]:
    """Process user message and generate AI PM response"""
    
    redis = request.app.state.redis
    gemini = request.app.state.gemini
    sio = request.app.state.sio
    
    context_engine = ContextEngine(redis)
    
    try:
        # Emit status update
        await sio.emit('status', {
            'currentAction': 'Analyzing message',
            'confidence': 0
        })
        
        # Get context
        context = await context_engine.analyze_context(project_id, content)
        
        # Emit status update
        await sio.emit('status', {
            'currentAction': 'Checking memory for similar issues',
            'confidence': context['confidence']
        })
        
        # Generate response based on context confidence
        if context['confidence'] > 0.85:
            # High confidence - use past solutions
            response = await gemini.use_past_solution(
                content, 
                context['past_solutions']
            )
        else:
            # Low confidence - need analysis
            response = await gemini.generate_analysis_prompt(
                content,
                context
            )
        
        # Store in memory
        await redis.store_memory(
            project_id,
            content[:50],  # Use first 50 chars as key
            content,
            'error'
        )
        
        # Create message with metadata
        message = Message(
            project_id=project_id,
            role='ai_pm',
            content=response['content'],
            metadata={
                'summary': response.get('summary'),
                'instruction': response.get('instruction'),
                'for_developer': response.get('for_developer', False),
                'confidence': context['confidence']
            }
        )
        
        # Store message
        await redis.store_message(message.dict())
        
        # Emit final status
        await sio.emit('status', {
            'currentAction': 'Complete',
            'confidence': context['confidence'],
            'memoryCount': await redis.get_memory_count(project_id)
        })
        
        return message.dict()
        
    except Exception as e:
        logger.error(f"Error processing message: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
```

---

## **Phase 5: Testing Strategy (Days 15-17)**

### **5.1 Unit Tests Structure**

**Backend Tests (tests/test_services.py):**
```python
import pytest
from app.services.gemini_service import GeminiService
from app.services.redis_service import RedisMemoryService
from app.services.context_engine import ContextEngine

@pytest.fixture
async def redis_service():
    service = RedisMemoryService()
    await service.connect()
    yield service
    await service.close()

@pytest.fixture
def gemini_service():
    return GeminiService()

class TestRedisMemoryService:
    async def test_store_and_recall_memory(self, redis_service):
        # Test storing memory
        result = await redis_service.store_memory(
            project_id="test-project",
            key="test-error",
            value="Error: undefined function",
            memory_type="error"
        )
        assert result == True
        
        # Test recalling memory
        memories = await redis_service.recall_memory(
            project_id="test-project",
            query="undefined",
            memory_types=["error"]
        )
        assert len(memories) > 0
        assert "undefined" in memories[0]['value']

class TestContextEngine:
    async def test_analyze_context(self, redis_service):
        engine = ContextEngine(redis_service)
        
        # Store some test data
        await redis_service.store_memory(
            "test-project",
            "previous-error",
            "TypeError: Cannot read property",
            "error"
        )
        
        # Analyze context
        context = await engine.analyze_context(
            "test-project",
            "TypeError: Cannot read"
        )
        
        assert 'similar_issues' in context
        assert context['confidence'] > 0
```

**Frontend Tests (components/chat/ChatArea.test.tsx):**
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ChatArea from '@/components/chat/ChatArea'
import { useStore } from '@/lib/store/useStore'

jest.mock('@/lib/store/useStore')

describe('ChatArea', () => {
  it('sends message when button clicked', async () => {
    const mockSendMessage = jest.fn()
    
    (useStore as jest.Mock).mockReturnValue({
      messages: [],
      sendMessage: mockSendMessage,
      deleteMessage: jest.fn()
    })
    
    render(<ChatArea projectId="test-project" />)
    
    const input = screen.getByPlaceholderText(/Describe your issue/)
    const button = screen.getByRole('button')
    
    fireEvent.change(input, { target: { value: 'Test error' } })
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('test-project', 'Test error')
    })
  })
})
```

### **5.2 Integration Test Scenarios**

```python
# tests/test_integration.py
class TestFullFlow:
    async def test_complete_analysis_flow(self):
        """Test complete flow from error to solution"""
        
        # 1. Create project
        project_response = await client.post("/api/projects", 
            json={"name": "Test Project"})
        project_id = project_response.json()['id']
        
        # 2. Send error message
        chat_response = await client.post("/api/chat",
            json={
                "project_id": project_id,
                "content": "Error: Payment gateway timeout"
            })
        
        assert chat_response.status_code == 200
        response_data = chat_response.json()
        
        # 3. Verify response structure
        assert 'metadata' in response_data
        assert 'instruction' in response_data['metadata']
        assert 'summary' in response_data['metadata']
        
        # 4. Verify memory storage
        memories = await redis_service.recall_memory(
            project_id, 
            "Payment gateway"
        )
        assert len(memories) > 0
```

---

## **Phase 6: Deployment & Production (Days 18-20)**

### **6.1 Docker Configuration**

**docker-compose.yml:**
```yaml
version: '3.9'

services:
  redis:
    image: redis:7.4.1-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  backend:
    build: ./ai-pm-backend
    ports:
      - "8000:8000"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - redis
    volumes:
      - ./ai-pm-backend:/app

  frontend:
    build: ./ai-pm-frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
    depends_on:
      - backend

volumes:
  redis_data:
```

**Backend Dockerfile:**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

**Frontend Dockerfile:**
```dockerfile
FROM node:20.18.0-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

CMD ["npm", "start"]
```

---

## **System Prompts for Gemini**

### **Primary AI PM System Prompt**

```python
SYSTEM_PROMPT = """
You are an AI Project Manager with the following strict rules:

1. ANALYSIS REQUIREMENT:
   - NEVER provide solutions without complete understanding
   - If confidence < 85%, demand more analysis
   - Always check memory for similar issues first

2. OUTPUT FORMAT:
   For every response, generate THREE components:
   
   a) Developer Instructions (technical, detailed):
      - Specific file locations and line numbers
      - Exact commands to run
      - Expected outputs to verify
   
   b) User Summary (simple, friendly):
      - 10-15 sentences maximum
      - No technical jargon
      - Focus on progress and next steps
   
   c) Confidence Assessment:
      - Percentage based on past solutions
      - List what's still unclear
      - Next questions to ask

3. VERIFICATION LOOP:
   - After receiving analysis, ask for:
     * Exact code changes (line by line)
     * Dependencies affected
     * Test results
   - Never accept vague responses

4. MEMORY MANAGEMENT:
   - Store every error pattern
   - Store every successful solution
   - Build dependency maps
   - Mark critical no-change zones

5. TONE:
   - Professional but encouraging
   - Keep user motivated
   - Celebrate small wins
   - Never show frustration
"""
```

---

## **Critical Success Metrics**

### **Performance Requirements**
- Response time: < 2 seconds for cached queries
- Memory recall accuracy: > 95%
- Context relevance: > 90%
- Zero regression policy: No previously fixed issues should break

### **Testing Checkpoints**
1. **Phase 1 Complete:** Project creation and basic structure works
2. **Phase 2 Complete:** Can store and recall from Redis
3. **Phase 3 Complete:** UI displays messages with proper formatting
4. **Phase 4 Complete:** Real-time updates via WebSocket
5. **Phase 5 Complete:** All tests passing (>80% coverage)
6. **Phase 6 Complete:** Docker deployment successful

---

## **Common Pitfalls to Avoid**

1. **Don't forget to handle WebSocket reconnection**
2. **Always validate Gemini responses before displaying**
3. **Implement rate limiting for API calls**
4. **Store Redis data with proper TTL**
5. **Handle network failures gracefully**
6. **Don't expose API keys in frontend code**

---

## **Next Steps After MVP**

1. Add authentication system
2. Implement project sharing
3. Add export functionality for solutions
4. Create analytics dashboard
5. Add voice input support
6. Implement batch analysis for multiple errors

---

This PRD provides a complete roadmap for building the AI PM system. Each phase builds upon the previous one, ensuring a stable and scalable application. The AI developer should follow these phases sequentially, testing thoroughly at each checkpoint before proceeding to the next phase.