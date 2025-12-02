import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface MultiSelectAgeProps {
  options: readonly string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

const MultiSelectAge = ({
  options,
  selected,
  onChange,
  placeholder = "Selecciona opciones",
  className,
}: MultiSelectAgeProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    // If "Cualquier rango de edad" is selected, clear other selections
    if (option === "Cualquier rango de edad") {
      onChange(selected.includes(option) ? [] : [option]);
      return;
    }
    
    // If selecting another option while "Cualquier rango" is selected, remove it
    const filtered = selected.filter(s => s !== "Cualquier rango de edad");
    
    if (filtered.includes(option)) {
      onChange(filtered.filter((s) => s !== option));
    } else {
      onChange([...filtered, option]);
    }
  };

  const removeOption = (option: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((s) => s !== option));
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={isOpen}
        className="w-full justify-between h-auto min-h-10 font-normal"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-1 items-center">
          {selected.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            selected.map((item) => (
              <Badge
                key={item}
                variant="secondary"
                className="mr-1 mb-1 mt-1"
              >
                {item}
                <button
                  className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => removeOption(item, e)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))
          )}
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </Button>
      
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
          <div className="max-h-60 overflow-auto p-1">
            {options.map((option) => (
              <div
                key={option}
                className={cn(
                  "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                  selected.includes(option) && "bg-accent"
                )}
                onClick={() => toggleOption(option)}
              >
                <div className={cn(
                  "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                  selected.includes(option) ? "bg-primary text-primary-foreground" : "opacity-50"
                )}>
                  {selected.includes(option) && <Check className="h-3 w-3" />}
                </div>
                {option}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectAge;
