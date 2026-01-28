import { ReactNode, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  CommandPalette,
  CommandPaletteHint,
} from "@/components/ui/CommandPalette";

interface HeaderProps {
  title?: string;
  backButton?: ReactNode;
}

export function Header({ title, backButton }: HeaderProps) {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Global CMD+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const displayName =
    profile?.name?.trim() ||
    (typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "") ||
    user?.email?.split("@")[0] ||
    "Användare";
  const displayEmail = profile?.email || user?.email || "";

  const initials =
    displayName
      .split(/[\s._-]+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <>
      <header
        className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-sand bg-warm-white/95 backdrop-blur px-6"
        role="banner"
      >
        <div className="flex items-center gap-4">
          {backButton}
          {title && (
            <h1 className="text-xl font-display font-bold text-charcoal">
              {title}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-4">
          <CommandPaletteHint onClick={() => setCommandPaletteOpen(true)} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full"
                aria-label={`Användarmeny för ${displayName}`}
              >
                <Avatar>
                  <AvatarImage src={profile?.avatar_url || undefined} alt="" />
                  <AvatarFallback aria-hidden="true">{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-ash">{displayEmail}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <User className="mr-2 h-4 w-4" aria-hidden="true" />
                Min profil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-terracotta focus:text-terracotta"
              >
                <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                Logga ut
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
    </>
  );
}
