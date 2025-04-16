import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Action {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  color?: "primary" | "secondary" | "accent";
}

interface ActionCardProps {
  title: string;
  description: string;
  actions: Action[];
}

export function ActionCard({ title, description, actions }: ActionCardProps) {
  return (
    <Card className="overflow-hidden bg-white shadow">
      <CardContent className="p-5">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">
          {description}
        </p>
        <div className="mt-6 flex flex-col space-y-3">
          {actions.map((action, index) => {
            const color = action.color || "primary";
            
            return (
              <Button
                key={index}
                variant={action.primary ? "default" : "outline"}
                className={cn(
                  "justify-start",
                  !action.primary && color === "primary" && "bg-primary bg-opacity-10 text-primary hover:bg-opacity-20 border-0",
                  !action.primary && color === "secondary" && "bg-secondary bg-opacity-10 text-secondary hover:bg-opacity-20 border-0",
                  !action.primary && color === "accent" && "bg-accent bg-opacity-10 text-accent hover:bg-opacity-20 border-0"
                )}
                onClick={action.onClick}
              >
                {action.icon}
                {action.label}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
