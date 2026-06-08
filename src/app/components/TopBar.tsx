import { ChevronDown, Moon, Sun } from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import type { Community } from "../types";
import type { UserInfo } from "../lib/membraneSession";
import type { AdminPage } from "./AdminPages";

interface TopBarProps {
  community: Community;
  onCommunityChange?: (communityId: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenAdmin: (page: AdminPage) => void;
  // Identity from /auth/me when a Cognito session is active; null on the dev
  // X-Scope path (no login). Drives the account-menu identity + sign-in/out.
  me: UserInfo | null;
  onSignIn: () => void;
  onLogout: () => void;
}

// Short label for the signed-in identity. /auth/me returns user_id (the Cognito
// sub) and org/team; email isn't carried on the scope, so the sub is the stable
// display until friendlier identity lands (PM 53f7abb3 §7 fast-follow).
function identityLabel(me: UserInfo): string {
  return me.email || me.user_id;
}

function avatarLetter(me: UserInfo | null): string {
  const s = me ? identityLabel(me) : "";
  return s ? s.charAt(0).toUpperCase() : "U";
}

export function TopBar({
  community,
  isDark,
  onToggleTheme,
  onOpenAdmin,
  me,
  onSignIn,
  onLogout,
}: TopBarProps) {
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
                  {avatarLetter(me)}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="font-normal">
              {me ? (
                <span className="block truncate text-xs text-muted-foreground" title={identityLabel(me)}>
                  {identityLabel(me)}
                </span>
              ) : (
                <span className="block text-xs text-muted-foreground">Not signed in (dev scope)</span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onOpenAdmin("profile")}>
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onOpenAdmin("models")}>
              Models
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onOpenAdmin("access")}>
              Members & Access
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {me ? (
              <DropdownMenuItem onClick={onLogout}>Log out</DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={onSignIn}>Sign in</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
