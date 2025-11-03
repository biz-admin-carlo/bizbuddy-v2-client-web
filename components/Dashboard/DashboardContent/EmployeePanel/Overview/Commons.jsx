// components/Dashboard/DashboardContent/Features/Overview/Commons.jsx
/* eslint-disable react-hooks/exhaustive-deps */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  Tooltip as RTooltip,
  Legend,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";

const COLORS = ["#f97316", "#0ea5e9", "#84cc16", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b", "#6366f1"];

// Custom tooltip styling for better consistency
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2">
        {label && <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</p>}
        {payload.map((entry, index) => (
          <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const ChartCard = ({ title, children }) => (
  <Card className="border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors overflow-hidden shadow-none">
    <div className="h-1 w-full bg-gradient-to-r from-orange-500 to-orange-400" />
    <CardHeader className="py-3 px-4 bg-gray-50/50 dark:bg-gray-900/20">
      <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</CardTitle>
    </CardHeader>
    <CardContent className="h-72 p-4">{children}</CardContent>
  </Card>
);

export const PieSimple = ({ data }) => {
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        style={{ 
          fontSize: '11px',
          fontFamily: 'inherit',
          fontWeight: '500'
        }}
      >
        {`${name}: ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <ResponsiveContainer>
      <PieChart 
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        style={{ fontFamily: 'inherit' }}
      >
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          outerRadius={60}
          innerRadius={20}
          paddingAngle={2}
          label={renderLabel}
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} strokeWidth={1} />
          ))}
        </Pie>
        <RTooltip content={<CustomTooltip />} />
        <Legend 
          layout="horizontal" 
          verticalAlign="bottom" 
          align="center"
          wrapperStyle={{ 
            fontSize: '12px',
            fontFamily: 'inherit',
            paddingTop: '10px'
          }}
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export const BarSimple = ({ data, x, y }) => (
  <ResponsiveContainer>
    <BarChart 
      data={data} 
      margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
      style={{ fontFamily: 'inherit' }}
    >
      <CartesianGrid 
        strokeDasharray="3 3" 
        vertical={false} 
        opacity={0.1}
        className="stroke-gray-200 dark:stroke-gray-700"
      />
      <XAxis 
        dataKey={x} 
        axisLine={false} 
        tickLine={false} 
        tick={{ 
          fontSize: 11,
          fontFamily: 'inherit',
          fill: 'currentColor'
        }}
        className="text-gray-600 dark:text-gray-400"
        tickMargin={8} 
      />
      <YAxis 
        axisLine={false} 
        tickLine={false} 
        tick={{ 
          fontSize: 11,
          fontFamily: 'inherit',
          fill: 'currentColor'
        }}
        className="text-gray-600 dark:text-gray-400"
        tickMargin={8} 
      />
      <Bar 
        dataKey={y} 
        fill="#f97316" 
        radius={[4, 4, 0, 0]} 
        barSize={24} 
        animationDuration={1500}
      />
      <RTooltip 
        content={<CustomTooltip />}
        cursor={{ fill: "rgba(249, 115, 22, 0.05)" }} 
      />
    </BarChart>
  </ResponsiveContainer>
);

export const LineSimple = ({ data, x, y }) => (
  <ResponsiveContainer>
    <LineChart 
      data={data} 
      margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
      style={{ fontFamily: 'inherit' }}
    >
      <CartesianGrid 
        strokeDasharray="3 3" 
        opacity={0.1}
        className="stroke-gray-200 dark:stroke-gray-700"
      />
      <XAxis 
        dataKey={x} 
        axisLine={false} 
        tickLine={false} 
        tick={{ 
          fontSize: 11,
          fontFamily: 'inherit',
          fill: 'currentColor'
        }}
        className="text-gray-600 dark:text-gray-400"
        tickMargin={8} 
      />
      <YAxis 
        axisLine={false} 
        tickLine={false} 
        tick={{ 
          fontSize: 11,
          fontFamily: 'inherit',
          fill: 'currentColor'
        }}
        className="text-gray-600 dark:text-gray-400"
        tickMargin={8} 
      />
      <Line
        type="monotone"
        dataKey={y}
        stroke="#f97316"
        strokeWidth={2.5}
        dot={{ r: 3, strokeWidth: 2, fill: "#fff" }}
        activeDot={{ r: 5, strokeWidth: 0, fill: "#f97316" }}
        animationDuration={1500}
      />
      <RTooltip content={<CustomTooltip />} />
    </LineChart>
  </ResponsiveContainer>
);

export const GroupedBarSimple = ({ data, x, y1, y2, label1, label2 }) => (
  <ResponsiveContainer>
    <BarChart 
      data={data} 
      margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
      style={{ fontFamily: 'inherit' }}
    >
      <CartesianGrid 
        strokeDasharray="3 3" 
        vertical={false} 
        opacity={0.1}
        className="stroke-gray-200 dark:stroke-gray-700"
      />
      <XAxis 
        dataKey={x} 
        axisLine={false} 
        tickLine={false} 
        tick={{ 
          fontSize: 11,
          fontFamily: 'inherit',
          fill: 'currentColor'
        }}
        className="text-gray-600 dark:text-gray-400"
        tickMargin={8} 
      />
      <YAxis 
        axisLine={false} 
        tickLine={false} 
        tick={{ 
          fontSize: 11,
          fontFamily: 'inherit',
          fill: 'currentColor'
        }}
        className="text-gray-600 dark:text-gray-400"
        tickMargin={8} 
      />
      <Bar 
        dataKey={y1} 
        name={label1} 
        fill="#f97316" 
        radius={[4, 4, 0, 0]} 
        barSize={12} 
        animationDuration={1500} 
      />
      <Bar 
        dataKey={y2} 
        name={label2} 
        fill="#0ea5e9" 
        radius={[4, 4, 0, 0]} 
        barSize={12} 
        animationDuration={1500} 
      />
      <Legend 
        iconType="circle" 
        iconSize={8}
        wrapperStyle={{ 
          fontSize: '12px',
          fontFamily: 'inherit',
          paddingTop: '10px'
        }}
      />
      <RTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0, 0, 0, 0.02)" }} />
    </BarChart>
  </ResponsiveContainer>
);

export const StackedBarSimple = ({ data, x, series }) => (
  <ResponsiveContainer>
    <BarChart 
      data={data} 
      margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
      style={{ fontFamily: 'inherit' }}
    >
      <CartesianGrid 
        strokeDasharray="3 3" 
        vertical={false} 
        opacity={0.1}
        className="stroke-gray-200 dark:stroke-gray-700"
      />
      <XAxis 
        dataKey={x} 
        axisLine={false} 
        tickLine={false} 
        tick={{ 
          fontSize: 11,
          fontFamily: 'inherit',
          fill: 'currentColor'
        }}
        className="text-gray-600 dark:text-gray-400"
        tickMargin={8} 
      />
      <YAxis 
        axisLine={false} 
        tickLine={false} 
        tick={{ 
          fontSize: 11,
          fontFamily: 'inherit',
          fill: 'currentColor'
        }}
        className="text-gray-600 dark:text-gray-400"
        tickMargin={8} 
      />
      {series.map((s, i) => (
        <Bar
          key={s.key}
          dataKey={s.key}
          stackId="a"
          name={s.label}
          fill={COLORS[i % COLORS.length]}
          radius={i === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
          animationDuration={1500}
        />
      ))}
      <Legend 
        iconType="circle" 
        iconSize={8}
        wrapperStyle={{ 
          fontSize: '12px',
          fontFamily: 'inherit',
          paddingTop: '10px'
        }}
      />
      <RTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0, 0, 0, 0.02)" }} />
    </BarChart>
  </ResponsiveContainer>
);

export const AreaSimple = ({ data, x, y }) => (
  <ResponsiveContainer>
    <AreaChart 
      data={data} 
      margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
      style={{ fontFamily: 'inherit' }}
    >
      <CartesianGrid 
        strokeDasharray="3 3" 
        opacity={0.1}
        className="stroke-gray-200 dark:stroke-gray-700"
      />
      <XAxis 
        dataKey={x} 
        axisLine={false} 
        tickLine={false} 
        tick={{ 
          fontSize: 11,
          fontFamily: 'inherit',
          fill: 'currentColor'
        }}
        className="text-gray-600 dark:text-gray-400"
        tickMargin={8} 
      />
      <YAxis 
        axisLine={false} 
        tickLine={false} 
        tick={{ 
          fontSize: 11,
          fontFamily: 'inherit',
          fill: 'currentColor'
        }}
        className="text-gray-600 dark:text-gray-400"
        tickMargin={8} 
      />
      <Area 
        type="monotone" 
        dataKey={y} 
        stroke="#f97316" 
        fill="url(#colorGradient)" 
        strokeWidth={2} 
        animationDuration={1500} 
      />
      <defs>
        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
          <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
        </linearGradient>
      </defs>
      <RTooltip content={<CustomTooltip />} />
    </AreaChart>
  </ResponsiveContainer>
);