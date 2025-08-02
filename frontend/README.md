# KenKai Assistant Frontend

Premium multi-agent AI assistant dashboard built with Next.js 14, Tailwind CSS, and Framer Motion.

## Features

- **🎨 Premium SaaS Design**: Clean, modern interface with dark/light mode
- **🤖 Agent Sidebar**: Visual agent selection with status indicators
- **💬 Animated Chat**: Smooth message bubbles with copy functionality
- **🎤 Voice Integration**: Voice button placeholder for ElevenLabs integration
- **📱 Responsive**: Mobile-first design with sidebar overlay
- **⚡ Real-time**: Live API integration with memory context
- **🎭 Animations**: Framer Motion powered smooth transitions

## Quick Start

1. **Install Dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Start Development Server:**
   ```bash
   npm run dev
   ```

3. **Open Browser:**
   ```
   http://localhost:3001
   ```

## Project Structure

```
frontend/
├── app/                    # Next.js 14 App Router
│   ├── layout.tsx         # Root layout with theme provider
│   ├── page.tsx           # Main dashboard page
│   └── globals.css        # Global styles with CSS variables
│
├── components/            # Reusable UI components
│   ├── agent-sidebar.tsx  # Agent selection sidebar
│   ├── chat-interface.tsx # Message display area
│   ├── chat-input.tsx     # Input with voice button
│   ├── message-bubble.tsx # Individual message component
│   ├── theme-toggle.tsx   # Dark/light mode toggle
│   ├── theme-provider.tsx # Theme context provider
│   ├── logo.tsx           # KenKai branding component
│   └── loading-shimmer.tsx # Loading skeleton states
│
├── lib/                   # Utilities and API client
│   ├── api.ts            # Type-safe API client
│   └── utils.ts          # Helper functions
│
└── styles/                # Additional stylesheets
```

## API Integration

The frontend automatically connects to the backend API:

- **Agent Communication**: `POST /api/agent/:agentId?memory=true`
- **Memory Context**: Persistent conversation history
- **Error Handling**: Graceful error display and recovery
- **Loading States**: Shimmer effects during API calls

## Design System

### Colors
- **Primary**: Blue gradient for branding and CTAs
- **Secondary**: Muted backgrounds and borders
- **Accent**: Interactive elements and hover states
- **Semantic**: Success (green), warning (yellow), error (red)

### Typography
- **Font**: Inter variable font
- **Hierarchy**: h1-h6 with consistent spacing
- **Body**: Readable line heights and letter spacing

### Spacing
- **Scale**: 4px base unit (1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64)
- **Containers**: Max-width containers for content
- **Grids**: CSS Grid and Flexbox layouts

## Components

### AgentSidebar
- Agent selection with status indicators
- Animated active state highlighting
- Memory usage visualization
- Responsive collapse on mobile

### ChatInterface
- Animated message bubbles
- Auto-scroll with manual override
- Copy message functionality
- Empty state with onboarding

### ChatInput
- Auto-resizing textarea
- Voice recording button (placeholder)
- Keyboard shortcuts (Enter to send)
- Character count and validation

### ThemeToggle
- Smooth dark/light mode transition
- System theme detection
- Persistent theme preference

## Customization

### Adding New Agents
```tsx
// In agent-sidebar.tsx
const agents: Agent[] = [
  {
    id: 'custom',
    name: 'Custom Agent',
    description: 'Your custom agent description',
    icon: <YourIcon className="h-5 w-5" />,
    status: 'active',
  },
  // ... existing agents
];
```

### Styling Themes
```css
/* In globals.css */
.dark {
  --background: your-dark-background;
  --foreground: your-dark-text;
  /* ... other variables */
}
```

### Custom Animations
```tsx
// Using Framer Motion
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  Your content
</motion.div>
```

## Development

### Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

### Environment Variables
```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Production Deployment

### Build and Deploy
```bash
npm run build
npm run start
```

### Vercel Deployment
```bash
npx vercel --prod
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

The frontend is production-ready with optimized performance, accessibility, and user experience.