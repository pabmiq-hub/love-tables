import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Minus, RotateCcw, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgeRangeSliderProps {
  ranges: string[];
  onChange: (ranges: string[]) => void;
  defaultRanges: readonly string[];
}

interface RangeData {
  min: number;
  max: number | null; // null means no upper limit (e.g., "50+")
}

const MIN_AGE = 18;
const MAX_AGE = 65;
const MIN_RANGE_SIZE = 5;

// Parse "18-24" or "50+" format to RangeData
const parseRange = (range: string): RangeData => {
  const cleanRange = range.replace("–", "-").replace("+", "");
  
  if (range.includes("+")) {
    const min = parseInt(cleanRange);
    return { min: isNaN(min) ? MIN_AGE : min, max: null };
  }
  
  const parts = cleanRange.split("-").map(n => parseInt(n.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { min: parts[0], max: parts[1] };
  }
  
  return { min: MIN_AGE, max: MAX_AGE };
};

// Format RangeData back to string
const formatRange = (range: RangeData): string => {
  if (range.max === null || range.max >= MAX_AGE) {
    return `${range.min}+`;
  }
  return `${range.min}-${range.max}`;
};

// Parse all ranges and sort by min age
const parseRanges = (ranges: string[]): RangeData[] => {
  return ranges.map(parseRange).sort((a, b) => a.min - b.min);
};

// Validate and fix ranges to ensure they're contiguous
const normalizeRanges = (rangesData: RangeData[]): RangeData[] => {
  if (rangesData.length === 0) return [{ min: MIN_AGE, max: null }];
  
  const sorted = [...rangesData].sort((a, b) => a.min - b.min);
  const result: RangeData[] = [];
  
  // Ensure first range starts at MIN_AGE
  sorted[0] = { ...sorted[0], min: MIN_AGE };
  
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    
    if (next) {
      // Make current max end at next min - 1
      result.push({ min: current.min, max: next.min - 1 });
    } else {
      // Last range has no upper limit
      result.push({ min: current.min, max: null });
    }
  }
  
  return result;
};

const AgeRangeSlider = ({ ranges, onChange, defaultRanges }: AgeRangeSliderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rangesData, setRangesData] = useState<RangeData[]>(() => 
    normalizeRanges(parseRanges(ranges))
  );
  const [dragging, setDragging] = useState<number | null>(null);

  useEffect(() => {
    setRangesData(normalizeRanges(parseRanges(ranges)));
  }, [ranges]);

  const updateRanges = useCallback((newRangesData: RangeData[]) => {
    const normalized = normalizeRanges(newRangesData);
    setRangesData(normalized);
    onChange(normalized.map(formatRange));
  }, [onChange]);

  // Handle divider drag
  const handleMouseDown = (index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(index);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragging === null || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const ageValue = Math.round(MIN_AGE + (MAX_AGE - MIN_AGE) * percentage);
    
    // The divider at index separates range[index] and range[index+1]
    // Moving divider changes: range[index].max and range[index+1].min
    const newRanges = [...rangesData];
    const prevRange = newRanges[dragging];
    const nextRange = newRanges[dragging + 1];
    
    if (prevRange && nextRange) {
      // Ensure minimum range sizes
      const minPrevMax = prevRange.min + MIN_RANGE_SIZE;
      const maxPrevMax = (nextRange.max !== null ? nextRange.max : MAX_AGE) - MIN_RANGE_SIZE;
      
      const clampedAge = Math.max(minPrevMax, Math.min(maxPrevMax, ageValue));
      
      newRanges[dragging] = { ...prevRange, max: clampedAge };
      newRanges[dragging + 1] = { ...nextRange, min: clampedAge + 1 };
      
      setRangesData(newRanges);
    }
  }, [dragging, rangesData]);

  const handleMouseUp = useCallback(() => {
    if (dragging !== null) {
      onChange(rangesData.map(formatRange));
      setDragging(null);
    }
  }, [dragging, rangesData, onChange]);

  useEffect(() => {
    if (dragging !== null) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Add a new range by splitting the largest one
  const addRange = () => {
    if (rangesData.length >= 8) return; // Max 8 ranges
    
    // Find the largest range
    let largestIndex = 0;
    let largestSize = 0;
    
    rangesData.forEach((range, i) => {
      const size = (range.max ?? MAX_AGE) - range.min;
      if (size > largestSize) {
        largestSize = size;
        largestIndex = i;
      }
    });
    
    const toSplit = rangesData[largestIndex];
    const splitPoint = Math.floor(toSplit.min + (((toSplit.max ?? MAX_AGE) - toSplit.min) / 2));
    
    const newRanges = [...rangesData];
    newRanges[largestIndex] = { min: toSplit.min, max: splitPoint };
    newRanges.splice(largestIndex + 1, 0, { min: splitPoint + 1, max: toSplit.max });
    
    updateRanges(newRanges);
  };

  // Remove a range by merging with the previous one
  const removeRange = (index: number) => {
    if (rangesData.length <= 1) return;
    
    const newRanges = [...rangesData];
    
    if (index === 0 && newRanges.length > 1) {
      // Merge first with second
      newRanges[1] = { ...newRanges[1], min: MIN_AGE };
      newRanges.splice(0, 1);
    } else {
      // Merge with previous
      newRanges[index - 1] = { ...newRanges[index - 1], max: newRanges[index].max };
      newRanges.splice(index, 1);
    }
    
    updateRanges(newRanges);
  };

  const resetToDefault = () => {
    updateRanges(parseRanges([...defaultRanges]));
  };

  const getPositionPercentage = (age: number): number => {
    return ((age - MIN_AGE) / (MAX_AGE - MIN_AGE)) * 100;
  };

  // Generate color for each range
  const getColor = (index: number): string => {
    const colors = [
      "bg-emerald-500/70",
      "bg-blue-500/70",
      "bg-violet-500/70",
      "bg-amber-500/70",
      "bg-rose-500/70",
      "bg-cyan-500/70",
      "bg-orange-500/70",
      "bg-pink-500/70",
    ];
    return colors[index % colors.length];
  };

  const isDefault = JSON.stringify(ranges.map(r => r.replace("–", "-"))) === 
                   JSON.stringify([...defaultRanges].map(r => r.replace("–", "-")));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">📊 Rangos de Edad</Label>
        <div className="flex gap-2">
          {!isDefault && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={resetToDefault}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Restaurar
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 text-xs"
            onClick={addRange}
            disabled={rangesData.length >= 8}
          >
            <Plus className="w-3 h-3 mr-1" />
            Añadir
          </Button>
        </div>
      </div>

      {/* Visual slider */}
      <div className="relative pt-6 pb-2">
        {/* Age labels */}
        <div className="absolute top-0 left-0 right-0 flex justify-between text-xs text-muted-foreground">
          <span>{MIN_AGE}</span>
          <span>30</span>
          <span>40</span>
          <span>50</span>
          <span>{MAX_AGE}+</span>
        </div>

        {/* Slider track */}
        <div 
          ref={containerRef}
          className="relative h-12 bg-muted/30 rounded-lg overflow-hidden border"
        >
          {/* Range segments */}
          {rangesData.map((range, index) => {
            const left = getPositionPercentage(range.min);
            const right = range.max !== null ? getPositionPercentage(range.max + 1) : 100;
            const width = right - left;
            
            return (
              <div
                key={index}
                className={cn(
                  "absolute top-0 bottom-0 flex items-center justify-center transition-colors group",
                  getColor(index)
                )}
                style={{ left: `${left}%`, width: `${width}%` }}
              >
                <span className="text-xs font-medium text-white drop-shadow-sm">
                  {formatRange(range)}
                </span>
                {rangesData.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRange(index)}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/30 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    title="Eliminar rango"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Draggable dividers */}
          {rangesData.slice(0, -1).map((range, index) => {
            if (range.max === null) return null;
            const position = getPositionPercentage(range.max + 1);
            
            return (
              <div
                key={`divider-${index}`}
                className={cn(
                  "absolute top-0 bottom-0 w-4 -ml-2 cursor-ew-resize z-10 flex items-center justify-center group",
                  dragging === index && "bg-primary/20"
                )}
                style={{ left: `${position}%` }}
                onMouseDown={handleMouseDown(index)}
              >
                <div className={cn(
                  "w-1 h-8 rounded-full bg-background border-2 transition-colors",
                  dragging === index ? "border-primary" : "border-muted-foreground group-hover:border-primary"
                )}>
                  <GripVertical className="w-3 h-3 text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Range chips display */}
      <div className="flex flex-wrap gap-2">
        {rangesData.map((range, index) => (
          <div
            key={index}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium text-white flex items-center gap-1",
              getColor(index).replace("/70", "")
            )}
          >
            {formatRange(range)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgeRangeSlider;
