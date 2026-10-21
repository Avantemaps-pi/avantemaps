
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';

interface RankingData {
  keyword: string;
  position: number;
  searches: number;
  change: number;
}

interface RankingChartProps {
  data: RankingData[];
  title: string;
  description?: string;
}

const RankingChart: React.FC<RankingChartProps> = ({ data, title, description }) => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Keyword</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Monthly Searches</TableHead>
              <TableHead>Change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{item.keyword}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.position}</span>
                    <Progress value={Math.max(0, 100 - (item.position * 10))} className="h-2 w-24" />
                  </div>
                </TableCell>
                <TableCell>{item.searches}</TableCell>
                <TableCell>
                  <span className={item.change > 0 ? "text-primary" : item.change < 0 ? "text-foreground" : "text-muted-foreground"}>
                    {item.change > 0 ? '↑' : item.change < 0 ? '↓' : '→'} 
                    {Math.abs(item.change)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default RankingChart;
