# Command Palette

The Memory Agent system includes a universal command palette inspired by tools like Linear and Raycast, providing quick access to all system functions through keyboard shortcuts.

## Activation

- **Mac**: `⌘ + K` (Cmd + K)
- **Windows/Linux**: `Ctrl + K`

## Features

### 🔍 **Fuzzy Search**
- Type to search through all available commands
- Supports partial matching and fuzzy search
- Real-time filtering as you type

### ⌨️ **Keyboard Navigation**
- `↑` / `↓` Arrow keys to navigate
- `Enter` to execute selected command
- `Esc` to close the palette

### 📝 **Command Groups**

#### 🤖 **Agents**
- Switch to Research Agent (`⌘/Ctrl + 2`)
- Switch to Creative Agent (`⌘/Ctrl + 3`)
- Switch to Automation Agent (`⌘/Ctrl + 4`)
- Switch to General Chat (`⌘/Ctrl + 1`)

#### ⚙️ **Settings**
- Toggle Dark/Light Mode (`⌘/Ctrl + Shift + T`)
- Mute/Unmute Voice Output (`⌘/Ctrl + M`)
- Replay Welcome Tour
- Open Settings Panel (`⌘/Ctrl + ,`)

#### 🔧 **Utilities**
- Open Memory Viewer (`⌘/Ctrl + Shift + M`)
- Open Logs Viewer (`⌘/Ctrl + Shift + L`)
- Clear Current Chat (`⌘/Ctrl + Shift + X`)
- Scroll to Top (`⌘/Ctrl + ↑`)
- Scroll to Bottom (`⌘/Ctrl + ↓`)

#### 🧭 **Navigation**
- Focus Chat Input (`/`)
- Toggle Sidebar (`⌘/Ctrl + B`)

## Direct Keyboard Shortcuts

Many commands can be executed directly without opening the command palette:

### Agent Switching
- `⌘/Ctrl + 1` - General Chat
- `⌘/Ctrl + 2` - Research Agent
- `⌘/Ctrl + 3` - Creative Agent
- `⌘/Ctrl + 4` - Automation Agent

### Quick Actions
- `⌘/Ctrl + M` - Toggle voice mute
- `⌘/Ctrl + B` - Toggle sidebar
- `⌘/Ctrl + ,` - Open settings
- `/` - Focus chat input

### Panel Management
- `⌘/Ctrl + Shift + M` - Open Memory Viewer
- `⌘/Ctrl + Shift + L` - Open Logs Viewer
- `⌘/Ctrl + Shift + T` - Toggle theme

### Chat Management
- `⌘/Ctrl + Shift + X` - Clear chat (with confirmation)
- `⌘/Ctrl + ↑` - Scroll to top
- `⌘/Ctrl + ↓` - Scroll to bottom

## Usage Examples

### Finding Commands
1. Press `⌘/Ctrl + K` to open the command palette
2. Type "research" to find research-related commands
3. Use arrow keys to select "Switch to Research Agent"
4. Press `Enter` to execute

### Quick Agent Switching
- Press `⌘/Ctrl + 3` to instantly switch to Creative Agent
- No need to open the palette for direct shortcuts

### Managing Panels
- Press `⌘/Ctrl + Shift + M` to open Memory Viewer
- Or use the command palette: `⌘/Ctrl + K` → type "memory" → `Enter`

## Accessibility

- Full ARIA support with `role="dialog"`
- Screen reader compatible
- Keyboard-only navigation
- Respects user's reduced motion preferences
- High contrast support in both themes

## Technical Details

### Architecture
- Built with Zustand for state management
- Framer Motion for smooth animations
- Fuzzy search with scoring algorithm
- Modular command system for extensibility

### Command Structure
```typescript
interface Command {
  id: string;
  label: string;
  description?: string;
  group: 'agents' | 'settings' | 'utilities' | 'navigation';
  shortcut?: string;
  action: () => void | Promise<void>;
  disabled?: boolean;
}
```

### Adding Custom Commands
Commands are dynamically generated based on app state and can be extended through the command factory system.

## Smart Features

- **Context Awareness**: Commands are enabled/disabled based on current app state
- **Group Organization**: Commands are logically grouped for easier discovery
- **Shortcut Display**: Keyboard shortcuts are shown and adapt to platform (Mac vs PC)
- **Recent Commands**: Most recently used commands (future enhancement)
- **Smart Defaults**: Common actions have intuitive shortcuts