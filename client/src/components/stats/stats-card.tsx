import { ArrowDown, ArrowUp } from "lucide-react";

type StatsCardProps = {
  title: string;
  value: string | number;
  trend?: {
    value: string;
    isPositive: boolean;
  };
};

export function StatsCard({ title, value, trend }: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-gray-600 text-sm font-medium mb-4">{title}</h3>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {trend && (
        <div className={`mt-2 flex items-center text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-500'}`}>
          {trend.isPositive ? (
            <ArrowUp className="h-4 w-4 mr-1" />
          ) : (
            <ArrowDown className="h-4 w-4 mr-1" />
          )}
          <span>{trend.value}</span>
        </div>
      )}
    </div>
  );
}
