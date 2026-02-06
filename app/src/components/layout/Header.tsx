import { Bell, Search, MessageSquare } from "lucide-react";
import {
  Button,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Input,
} from "@/components/ui";

interface HeaderProps {
  title: string;
  onToggleAI?: () => void;
  showAIButton?: boolean;
}

export function Header({
  title,
  onToggleAI,
  showAIButton = true,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input type="search" placeholder="Sök..." className="pl-9" />
        </div>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-gray-600" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </Button>

        {showAIButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleAI}
            className="text-primary-600 hover:bg-primary-50"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
        )}

        <Avatar className="h-9 w-9">
          <AvatarImage src="" alt="User" />
          <AvatarFallback>PL</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
