import { ResponsiveContainer, LineChart as RechartsLineChart, Line, YAxis } from "recharts";

interface LineChartProps {
  data: number[];
}

export function LineChart({ data }: LineChartProps) {
  // Format data for recharts
  const chartData = data.map((value, index) => ({
    value,
    index,
  }));
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <YAxis hide domain={['auto', 'auto']} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#0095F6"
          strokeWidth={2}
          dot={false}
          activeDot={false}
          isAnimationActive={true}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
