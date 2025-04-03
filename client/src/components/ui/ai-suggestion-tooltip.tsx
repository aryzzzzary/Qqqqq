import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AISuggestionTooltipProps {
  suggestions: string[];
  isLoading?: boolean;
  onSelectSuggestion: (suggestion: string) => void;
  children: React.ReactNode;
}

export function AISuggestionTooltip({
  suggestions,
  isLoading = false,
  onSelectSuggestion,
  children,
}: AISuggestionTooltipProps) {
  const hasSuggestions = suggestions.length > 0;
  
  if (!hasSuggestions && !isLoading) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent 
          side="top" 
          align="start" 
          className="p-0 w-[450px] max-w-[90vw]"
        >
          <div className="p-3">
            <div className="mb-2 flex items-center">
              <span className="text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                AI Suggestions
              </span>
              {isLoading && (
                <Loader2 className="ml-2 h-3 w-3 animate-spin text-muted-foreground" />
              )}
            </div>
            
            {isLoading && !hasSuggestions && (
              <p className="text-xs text-muted-foreground">
                Generating suggestions...
              </p>
            )}
            
            {hasSuggestions && (
              <div className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <div 
                    key={index} 
                    className="bg-muted p-2 rounded-md text-xs hover:bg-muted/80 cursor-pointer group transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <p className="line-clamp-2 group-hover:text-primary">
                        {suggestion.length > 100 
                          ? `${suggestion.substring(0, 100)}...` 
                          : suggestion
                        }
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 ml-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onSelectSuggestion(suggestion)}
                      >
                        Use
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}