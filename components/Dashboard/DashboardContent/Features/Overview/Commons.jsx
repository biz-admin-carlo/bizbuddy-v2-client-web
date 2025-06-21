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

export const ChartCard = ({ title, children }) => (
  <Card className="border-2 dark:border-white/10 overflow-hidden shadow-sm transition-all hover:shadow-md">
    <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 to-orange-400" />
    <CardHeader className="py-3 px-4 bg-neutral-50 dark:bg-neutral-900/40">
      <CardTitle className="text-base font-medium">{title}</CardTitle>
    </CardHeader>
    <CardContent className="h-72 p-2">{children}</CardContent>
  </Card>
);

export const PieSimple = ({ data }) => (
  <ResponsiveContainer>
    <PieChart margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
      <Pie
        data={data}
        dataKey="value"
        nameKey="name"
        outerRadius={60}
        innerRadius={20}
        paddingAngle={2}
        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
      >
        {data.map((_, i) => (
          <Cell key={i} fill={COLORS[i % COLORS.length]} strokeWidth={1} />
        ))}
      </Pie>
      <RTooltip formatter={(value) => [`${value}`, "Value"]} />
      <Legend layout="horizontal" verticalAlign="bottom" align="center" />
    </PieChart>
  </ResponsiveContainer>
);

export const BarSimple = ({ data, x, y }) => (
  <ResponsiveContainer>
    <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
      <XAxis dataKey={x} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickMargin={8} />
      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickMargin={8} />
      <Bar dataKey={y} fill="#f97316" radius={[4, 4, 0, 0]} barSize={24} animationDuration={1500} />
      <RTooltip cursor={{ fill: "rgba(249, 115, 22, 0.1)" }} formatter={(value) => [`${value}`, y]} />
    </BarChart>
  </ResponsiveContainer>
);

export const LineSimple = ({ data, x, y }) => (
  <ResponsiveContainer>
    <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
      <XAxis dataKey={x} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickMargin={8} />
      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickMargin={8} />
      <Line
        type="monotone"
        dataKey={y}
        stroke="#f97316"
        strokeWidth={3}
        dot={{ r: 4, strokeWidth: 2 }}
        activeDot={{ r: 6, strokeWidth: 0, fill: "#f97316" }}
        animationDuration={1500}
      />
      <RTooltip formatter={(value) => [`${value}`, y]} />
    </LineChart>
  </ResponsiveContainer>
);

export const GroupedBarSimple = ({ data, x, y1, y2, label1, label2 }) => (
  <ResponsiveContainer>
    <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
      <XAxis dataKey={x} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickMargin={8} />
      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickMargin={8} />
      <Bar dataKey={y1} name={label1} fill="#f97316" radius={[4, 4, 0, 0]} barSize={12} animationDuration={1500} />
      <Bar dataKey={y2} name={label2} fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={12} animationDuration={1500} />
      <Legend iconType="circle" iconSize={8} />
      <RTooltip cursor={{ fill: "rgba(0, 0, 0, 0.05)" }} />
    </BarChart>
  </ResponsiveContainer>
);

export const StackedBarSimple = ({ data, x, series }) => (
  <ResponsiveContainer>
    <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
      <XAxis dataKey={x} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickMargin={8} />
      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickMargin={8} />
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
      <Legend iconType="circle" iconSize={8} />
      <RTooltip cursor={{ fill: "rgba(0, 0, 0, 0.05)" }} />
    </BarChart>
  </ResponsiveContainer>
);

/* New chart type: Area chart for trend visualization */
export const AreaSimple = ({ data, x, y }) => (
  <ResponsiveContainer>
    <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
      <XAxis dataKey={x} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickMargin={8} />
      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickMargin={8} />
      <Area type="monotone" dataKey={y} stroke="#f97316" fill="url(#colorGradient)" strokeWidth={2} animationDuration={1500} />
      <defs>
        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
          <stop offset="95%" stopColor="#f97316" stopOpacity={0.1} />
        </linearGradient>
      </defs>
      <RTooltip formatter={(value) => [`${value}`, y]} />
    </AreaChart>
  </ResponsiveContainer>
);
