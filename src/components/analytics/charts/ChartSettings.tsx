
import React from 'react';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface ChartSettingsProps {
  xScale: number;
  setXScale: (value: number) => void;
  yScale: number;
  setYScale: (value: number) => void;
  timelineFilter?: string;
  setTimelineFilter?: (value: string) => void;
}

const ChartSettings: React.FC<ChartSettingsProps> = React.memo(({
  xScale,
  setXScale,
  yScale,
  setYScale
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">X-Axis Scale</span>
          <span className="text-sm text-muted-foreground">{xScale}%</span>
        </div>
        <div className="flex items-center gap-2">
          <ZoomOut className="h-4 w-4 text-muted-foreground" />
          <Slider
            value={[xScale]}
            min={50}
            max={300}
            step={10}
            onValueChange={(value) => { const v = value[0]; if (v !== undefined) setXScale(v); }}
            className="flex-1"
          />
          <ZoomIn className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Y-Axis Scale</span>
          <span className="text-sm text-muted-foreground">{yScale}%</span>
        </div>
        <div className="flex items-center gap-2">
          <ZoomOut className="h-4 w-4 text-muted-foreground" />
          <Slider
            value={[yScale]}
            min={50}
            max={300}
            step={10}
            onValueChange={(value) => { const v = value[0]; if (v !== undefined) setYScale(v); }}
            className="flex-1"
          />
          <ZoomIn className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
});

ChartSettings.displayName = 'ChartSettings';

export default ChartSettings;
