# BuilderAI - AI-Powered SaaS Website Builder - Worklog

## Project Overview
Building a production-ready AI-powered SaaS website builder that behaves like an AI Software Engineer. Users can chat with AI and generate, modify, test, validate, and deploy complete Next.js applications.

## Current Status: Phase 1 Complete - Core Platform Operational

### Architecture Implemented
- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS + shadcn/ui + Framer Motion
- **Database**: Prisma + SQLite (7 models: User, Project, ProjectFile, Conversation, Message, ProjectMemory, ProjectVersion)
- **Auth**: Simple token-based auth (base64-encoded userId:timestamp)
- **AI Engine**: z-ai-web-dev-sdk via streaming API route (Server-Sent Events)
- **Multi-Agent Pipeline**: Planner → Engineer → Reviewer → QA → Deployer
- **State Management**: Zustand stores (auth, project, chat)

### Key Features Built
1. **Authentication**: Register/Login with email+password, persistent sessions
2. **Project Management**: Create, view, delete projects with default Next.js template files
3. **AI Chat Interface**: Beautiful chat UI with real-time agent status pipeline
4. **File Tree**: Hierarchical file browser with syntax-highlighted code viewer
5. **Code Generation**: AI generates Next.js files with `---FILE: path---` format, parsed and saved
6. **Code Validation**: 13 automated checks for project health
7. **Project Memory**: Persistent storage of requirements, decisions, routes, components
8. **Version Snapshots**: Save project versions with auto-incrementing version numbers
9. **Conversations**: Chat sessions with title, message history
10. **Responsive Design**: Mobile-friendly with responsive layouts

### Files Structure
```
src/
├── app/
│   ├── api/
│   │   ├── auth/{register,login,me}/route.ts
│   │   ├── chat/route.ts              # Streaming AI chat with multi-agent pipeline
│   │   └── projects/[id]/{files,memory,versions,conversations,validate}/route.ts
│   ├── layout.tsx
│   ├── page.tsx                        # Main entry - routes between auth/dashboard/workspace
│   └── globals.css
├── components/
│   ├── auth-screen.tsx                 # Login/Register with animated UI
│   ├── dashboard.tsx                   # Project list, stats, how-it-works
│   ├── workspace.tsx                   # Main workspace (file tree + chat + code)
│   ├── chat-panel.tsx                  # AI chat with agent status pipeline
│   ├── file-tree.tsx                   # Hierarchical file browser
│   └── code-viewer.tsx                 # Syntax-highlighted code with line numbers
├── stores/
│   ├── auth-store.ts                   # Auth state (Zustand)
│   ├── project-store.ts               # Projects, files state (Zustand)
│   └── chat-store.ts                  # Chat, agents state (Zustand)
├── lib/
│   ├── api.ts                          # API client with auth
│   ├── auth.ts                         # Auth utilities
│   ├── db.ts                           # Prisma client
│   ├── templates.ts                    # Default Next.js template
│   └── utils.ts                        # Utility functions
mini-services/
└── chat-service/                       # Socket.IO service (backup, not currently used)
```

### Bugs Fixed During Development
1. **Auth screen tabs** - Two disconnected Tabs components merged into one controlled component
2. **File tree duplicate keys** - Fixed `buildTree` condition for matching node types
3. **selectFile type mismatch** - Updated to accept both string ID and ProjectFile object
4. **Validation auth bug** - Changed raw fetch to use authenticated API client
5. **Create Project dialog** - Moved Dialog to component top level for proper rendering

### Unresolved Issues / Next Steps
1. **WebSocket gateway** - Caddy gateway doesn't forward to port 3003 (falls back to streaming API)
2. **Live preview** - Preview tab shows file list but no actual rendering
3. **Deployment system** - Deploy tab shows readiness checklist but no actual deployment
4. **File editing** - Code viewer is read-only (no inline editing)
5. **Model selection** - Only uses default z-ai-web-dev-sdk model (no multi-provider)
6. **Error handling** - Need better error display for failed API calls
7. **Stale state** - Zustand store may persist across user sessions on HMR
8. **Dark mode** - CSS variables set but no theme toggle implemented

### Priority Recommendations
1. **Implement live preview** using sandboxed iframe or build process
2. **Add file editing** capability in the code viewer
3. **Implement actual deployment** to Vercel
4. **Add theme toggle** for dark/light mode
5. **Improve error feedback** for failed operations
