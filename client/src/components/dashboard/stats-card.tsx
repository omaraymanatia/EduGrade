import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  linkText?: string;
  linkHref?: string;
  color?: "primary" | "secondary" | "accent" | "green" | "red" | "yellow";
}

export function StatsCard({ title, value, icon, linkText, linkHref, color = "primary" }: StatsCardProps) {
  const colorClasses = {
    primary: "bg-primary text-white",
    secondary: "bg-secondary text-white",
    accent: "bg-accent text-white",
    green: "bg-green-600 text-white",
    red: "bg-red-600 text-white",
    yellow: "bg-yellow-500 text-white",
  };
  
  const linkClasses = {
    primary: "text-primary hover:text-primary-dark",
    secondary: "text-secondary hover:text-secondary-dark",
    accent: "text-accent hover:text-accent-dark",
    green: "text-green-600 hover:text-green-700",
    red: "text-red-600 hover:text-red-700",
    yellow: "text-yellow-500 hover:text-yellow-600",
  };
  
  return (
    <Card className="overflow-hidden bg-white shadow">
      <CardContent className="p-0">
        <div className="p-5">
          <div className="flex items-center">
            <div className={cn("flex-shrink-0 p-3 rounded-md", colorClasses[color])}>
              {icon}
            </div>
            <div className="flex-1 w-0 ml-5">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {title}
                </dt>
                <dd className="text-2xl font-semibold text-gray-900">
                  {value}
                </dd>
              </dl>
            </div>
          </div>
        </div>
        {linkText && linkHref && (
          <div className="px-5 py-3 bg-gray-50">
            <div className="text-sm">
              <Link href={linkHref}>
                <a className={cn("font-medium", linkClasses[color])}>
                  {linkText}
                </a>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
