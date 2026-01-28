/**
 * Centralized icon registry for Lucide React
 *
 * Import icons from this file instead of 'lucide-react' directly.
 * This enables better tree-shaking and smaller bundle sizes.
 *
 * Usage:
 *   import { Icons } from '@/lib/icons';
 *   <Icons.Home className="h-4 w-4" />
 */

import {
  // Navigation & Layout
  Home,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ArrowLeft,
  ArrowRight,
  ExternalLink,

  // Actions
  Plus,
  Minus,
  Edit,
  Trash2,
  Save,
  Search,
  Filter,
  Download,
  Upload,
  Copy,
  Check,
  RefreshCw,
  MoreHorizontal,
  MoreVertical,

  // User & Auth
  User,
  Users,
  LogOut,
  LogIn,
  Settings,
  UserPlus,

  // Communication
  Mail,
  Phone,
  MessageSquare,
  Send,

  // Business
  Building2,
  Briefcase,
  FileText,
  FolderOpen,
  Calendar,
  Clock,
  DollarSign,
  CreditCard,
  Receipt,
  TrendingUp,
  BarChart3,
  PieChart,

  // Tasks & Status
  CheckCircle,
  CheckCircle2,
  Circle,
  AlertCircle,
  AlertTriangle,
  Info,
  XCircle,
  Loader2,

  // Files & Media
  File,
  Image,
  Film,
  Paperclip,
  Link,

  // Knowledge
  BookOpen,
  Library,
  Lightbulb,
  Tag,
  Hash,

  // Misc
  Eye,
  EyeOff,
  Star,
  Heart,
  Bell,
  MapPin,
  Globe,
  Zap,
  Archive,
  Inbox,
  ListTodo,
  StickyNote,
  type LucideIcon,
} from "lucide-react";

// Export as named object for better tree-shaking
export const Icons = {
  // Navigation & Layout
  Home,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ArrowLeft,
  ArrowRight,
  ExternalLink,

  // Actions
  Plus,
  Minus,
  Edit,
  Trash2,
  Save,
  Search,
  Filter,
  Download,
  Upload,
  Copy,
  Check,
  RefreshCw,
  MoreHorizontal,
  MoreVertical,

  // User & Auth
  User,
  Users,
  LogOut,
  LogIn,
  Settings,
  UserPlus,

  // Communication
  Mail,
  Phone,
  MessageSquare,
  Send,

  // Business
  Building2,
  Briefcase,
  FileText,
  FolderOpen,
  Calendar,
  Clock,
  DollarSign,
  CreditCard,
  Receipt,
  TrendingUp,
  BarChart3,
  PieChart,

  // Tasks & Status
  CheckCircle,
  CheckCircle2,
  Circle,
  AlertCircle,
  AlertTriangle,
  Info,
  XCircle,
  Loader2,

  // Files & Media
  File,
  Image,
  Film,
  Paperclip,
  Link,

  // Knowledge
  BookOpen,
  Library,
  Lightbulb,
  Tag,
  Hash,

  // Misc
  Eye,
  EyeOff,
  Star,
  Heart,
  Bell,
  MapPin,
  Globe,
  Zap,
  Archive,
  Inbox,
  ListTodo,
  StickyNote,
} as const;

// Type for icon names
export type IconName = keyof typeof Icons;

// Export LucideIcon type for component props
export type { LucideIcon };

// Re-export individual icons for gradual migration
export {
  Home,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Plus,
  Minus,
  Edit,
  Trash2,
  Save,
  Search,
  Filter,
  Download,
  Upload,
  Copy,
  Check,
  RefreshCw,
  MoreHorizontal,
  MoreVertical,
  User,
  Users,
  LogOut,
  LogIn,
  Settings,
  UserPlus,
  Mail,
  Phone,
  MessageSquare,
  Send,
  Building2,
  Briefcase,
  FileText,
  FolderOpen,
  Calendar,
  Clock,
  DollarSign,
  CreditCard,
  Receipt,
  TrendingUp,
  BarChart3,
  PieChart,
  CheckCircle,
  CheckCircle2,
  Circle,
  AlertCircle,
  AlertTriangle,
  Info,
  XCircle,
  Loader2,
  File,
  Image,
  Film,
  Paperclip,
  Link,
  BookOpen,
  Library,
  Lightbulb,
  Tag,
  Hash,
  Eye,
  EyeOff,
  Star,
  Heart,
  Bell,
  MapPin,
  Globe,
  Zap,
  Archive,
  Inbox,
  ListTodo,
  StickyNote,
};
