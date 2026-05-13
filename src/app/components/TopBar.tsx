import { ChevronDown, Moon, Sun } from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import type { Community } from "../types";
import type { AdminPage } from "./AdminPages";

interface TopBarProps {
  community: Community;
  onCommunityChange?: (communityId: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenAdmin: (page: AdminPage) => void;
}

export function TopBar({ community, isDark, onToggleTheme, onOpenAdmin }: TopBarProps) {
  return (
    <div className="h-12 border-b border-border bg-background flex items-center px-4 justify-between">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-1.5">
            {community.name}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem>{community.name}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onToggleTheme}>
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Open account menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  U
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onOpenAdmin("profile")}>
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onOpenAdmin("models")}>
              Models
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
