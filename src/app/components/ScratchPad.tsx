import { X } from "lucide-react";
import { Button } from "./ui/button";

interface ScratchPadProps {
  onClose: () => void;
}

export function ScratchPad({ onClose }: ScratchPadProps) {
  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      <div className="h-12 border-b border-border flex items-center justify-between px-4">
        <h2 className="font-medium">Scratch pad</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-2">
          <div>Scratch pad — session-only, BYOM, web search always on</div>
          <div className="text-sm">(Placeholder content)</div>
        </div>
      </div>
    </div>
  );
}
