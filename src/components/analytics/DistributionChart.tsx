
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { ActiveShape, PieSectorDataItem } from 'recharts/types/util/types';

interface DistributionData {
  name: string;
  value: number;
  color: string;
}

interface DistributionChartProps {
  data: DistributionData[];
  title: string;
  description?: string;
}

const RADIAN = Math.PI / 180;

interface PieLabelProps {
  cx?: number | string;
  cy?: number | string;
  midAngle?: number;
  innerRadius?: number | string;
  outerRadius?: number | string;
  percent?: number;
  index?: number;
  name?: string;
}

// Modified label rendering function to position labels closer to center
const renderCustomizedLabel = (props: PieLabelProps) => {
  const cx = Number(props.cx ?? 0);
  const cy = Number(props.cy ?? 0);
  const midAngle = Number(props.midAngle ?? 0);
  const outerRadius = Number(props.outerRadius ?? 0);
  const percent = Number(props.percent ?? 0);

  // Move radius closer to center (from 0.8 to 0.65)
  const radius = outerRadius * 0.65;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize="12"
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// Define the type for CustomTooltip props
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload?: unknown;
    color?: string;
  }>;
  label?: string;
}

interface LegendEntry {
  color?: string;
  value?: string;
}

interface ActiveShapeProps {
  cx?: number;
  cy?: number;
  innerRadius?: number;
  outerRadius?: number;
  startAngle?: number;
  endAngle?: number;
  fill?: string;
}

const DistributionChart: React.FC<DistributionChartProps> = ({ data, title, description }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const handleMouseEnter = (_: unknown, index: number) => {
    setActiveIndex(index);
  };

  const handleMouseLeave = () => {
    setActiveIndex(null);
  };

  // Custom tooltip content with proper typing
  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    const first = payload?.[0];
    if (active && first) {
      return (
        <div className="bg-background p-2 rounded-md shadow-md border border-border text-sm">
          <p className="font-medium">{first.name}</p>
          <p className="text-muted-foreground">{`${first.value}%`}</p>
        </div>
      );
    }
    return null;
  };

  // Custom legend that arranges items in two rows for Traffic Sources chart
  const CustomizedLegend = (props: { payload?: LegendEntry[] }) => {
    const payload = props.payload ?? [];
    
    // Only apply the custom layout for Traffic Sources chart (4 items)
    if (payload.length === 4) {
      const firstRow = payload.slice(0, 2);
      const secondRow = payload.slice(2, 4);
      
      return (
        <div className="flex flex-col items-center gap-2 mt-2">
          <div className="flex justify-center gap-4">
            {firstRow.map((entry, index) => (
              <div key={`item-${index}`} className="flex items-center gap-1.5">
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs">{entry.value}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-4">
            {secondRow.map((entry, index) => (
              <div key={`item-${index}`} className="flex items-center gap-1.5">
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    // For other charts, use the default legend
    return (
      <div className="flex justify-center gap-4 mt-2">
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center gap-1.5">
            <div
              className="h-2 w-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-[240px] flex justify-center items-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={renderCustomizedLabel}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                {...(activeIndex !== null ? { activeIndex } : {})}
                activeShape={(((props: unknown) => {
                  const { cx = 0, cy = 0, outerRadius = 0, startAngle = 0, endAngle = 0, fill } = props as ActiveShapeProps;
                  return (
                    <g>
                      <path 
                        d={`M${cx},${cy} L${cx + outerRadius * Math.cos(-startAngle * RADIAN)},${cy + outerRadius * Math.sin(-startAngle * RADIAN)} A${outerRadius},${outerRadius} 0 ${endAngle - startAngle > 180 ? 1 : 0},0 ${cx + outerRadius * Math.cos(-endAngle * RADIAN)},${cy + outerRadius * Math.sin(-endAngle * RADIAN)} Z`} 
                        fill={fill}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    </g>
                  );
                }}) as ActiveShape<PieSectorDataItem>)}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color} 
                    stroke={activeIndex === index ? "#ffffff" : "transparent"} 
                    strokeWidth={activeIndex === index ? 2 : 0}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomizedLegend />} verticalAlign="bottom" align="center" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default DistributionChart;
