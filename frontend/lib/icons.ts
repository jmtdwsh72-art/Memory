// Centralized icon imports to enable tree-shaking and reduce bundle size
// Import only the icons we actually use across the app

import {
  // Core UI
  Search,
  Settings,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  
  // Communication
  MessageCircle,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  
  // Actions
  Copy,
  Check,
  Loader2,
  RotateCcw,
  RefreshCw,
  Square,
  Download,
  Eye,
  
  // Agents & Features
  Bot,
  Brain,
  Sparkles,
  Smile,
  Command,
  Zap,
  BarChart3,
  Hash,
  
  // Navigation & Layout
  ScrollText,
  Circle,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Home,
  
  // Theme & Visual
  Sun,
  Moon,
  Monitor,
  
  // Directional
  ArrowRight,
  
  // Status
  Wifi,
  WifiOff,
  
  // Data & Analysis
  TrendingUp,
  Filter,
  Calendar,
  Clock,
  User,
  Shield,
} from 'lucide-react';

// Export only the icons we use to enable proper tree-shaking
export {
  // Core UI
  Search,
  Settings,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  
  // Communication
  MessageCircle,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  
  // Actions
  Copy,
  Check,
  Loader2,
  RotateCcw,
  RefreshCw,
  Square,
  Download,
  Eye,
  
  // Agents & Features
  Bot,
  Brain,
  Sparkles,
  Smile,
  Command,
  Zap,
  BarChart3,
  Hash,
  
  // Navigation & Layout
  ScrollText,
  Circle,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Home,
  
  // Theme & Visual
  Sun,
  Moon,
  Monitor,
  
  // Directional
  ArrowRight,
  
  // Status
  Wifi,
  WifiOff,
  
  // Data & Analysis
  TrendingUp,
  Filter,
  Calendar,
  Clock,
  User,
  Shield,
};

// Type for all available icons
export type IconName = keyof typeof import('./icons');

// Icon component mapping for dynamic usage
export const iconComponents = {
  Search,
  MessageCircle,
  BarChart3,
  Zap,
  Bot,
  Sparkles,
  Smile,
  Settings,
  Hash,
} as const;

// Helper function to get icon component by name
export function getIconComponent(iconName: string): React.ComponentType<{ className?: string }> {
  return iconComponents[iconName as keyof typeof iconComponents] || Bot;
}