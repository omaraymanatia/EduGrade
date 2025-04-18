import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Home, FileText, History, User, Settings, LogOut } from "lucide-react";

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const role = user?.role;
  const baseUrl = `/${role}`;

  const navItems = [
    {
      title: "Dashboard",
      icon: Home,
      href: baseUrl,
    },
    {
      title: role === "professor" ? "Exams" : "My Exams",
      icon: FileText,
      href: `${baseUrl}/exams`,
    },
    {
      title: "Profile",
      icon: User,
      href: `${baseUrl}/profile`,
    },
  ];

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <aside
      className={cn(
        "w-64 bg-white shadow-md h-screen flex flex-col",
        className
      )}
    >
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-primary-600">AI Grader</h2>
        <p className="text-sm text-gray-600">
          {role === "professor" ? "Professor" : "Student"} Dashboard
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto">
        <div className="px-4 mb-3 mt-6">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Main
          </span>
        </div>

        {navItems.slice(0, 3).map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            title={item.title}
            isActive={location === item.href}
          />
        ))}

        <div className="px-4 my-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Account
          </span>
        </div>

        {navItems.slice(3).map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            title={item.title}
            isActive={location === item.href}
          />
        ))}

        <button
          onClick={handleLogout}
          className="flex items-center w-full px-6 py-3 text-gray-700 hover:bg-gray-100"
        >
          <LogOut className="h-5 w-5 mr-3 text-gray-400" />
          <span>Logout</span>
        </button>
      </nav>
    </aside>
  );
}

interface NavItemProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  isActive: boolean;
}

function NavItem({ href, icon: Icon, title, isActive }: NavItemProps) {
  return (
    <Link href={href}>
      <a
        className={cn(
          "flex items-center px-6 py-3",
          isActive
            ? "text-gray-700 bg-gray-100 border-r-4 border-primary-600"
            : "text-gray-700 hover:bg-gray-100"
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5 mr-3",
            isActive ? "text-primary-600" : "text-gray-400"
          )}
        />
        <span>{title}</span>
      </a>
    </Link>
  );
}
