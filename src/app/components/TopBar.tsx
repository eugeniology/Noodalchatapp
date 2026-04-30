import { ChevronDown, Key, KeyRound, LogOut, Moon, Sun } from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import type { Community } from "../types";

interface TopBarProps {
  community: Community;
  onCommunityChange?: (communityId: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onMenuItem?: (item: string) => void;
}

export function TopBar({ community, isDark, onToggleTheme, onMenuItem }: TopBarProps) {
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            aria-label="Account menu"
          >
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarFallback className="bg-primary text-primary-foreground">
                U
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => onMenuItem?.("Personal access tokens")}>
            <Key className="mr-2 h-4 w-4" />
            Personal access tokens
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onMenuItem?.("LLM API keys")}>
            <KeyRound className="mr-2 h-4 w-4" />
            LLM API keys
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onToggleTheme}>
            {isDark ? (
              <>
                <Sun className="mr-2 h-4 w-4" />
                Light theme
              </>
            ) : (
              <>
                <Moon className="mr-2 h-4 w-4" />
                Dark theme
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onMenuItem?.("Sign out")}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
