import { useAuth } from "@/hooks/use-auth";
import { Home, FileText, User, LogOut, X } from "lucide-react";
import { Link, useLocation } from "wouter";

type SidebarProps = {
  onClose?: () => void;
};

export function Sidebar({ onClose }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Helper to determine if a nav item is active
  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  const navItemClasses = (path: string) =>
    `py-2 px-4 rounded-md ${
      isActive(path)
        ? "bg-primary/20 text-primary"
        : "hover:bg-primary/10 text-white"
    } cursor-pointer transition-colors`;

  // Get user initials for avatar
  const userInitials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;

  return (
    <div className="bg-gray-900 text-white w-full md:w-64 h-full flex-shrink-0">
      <div className="p-6 border-b border-gray-700 flex justify-between items-center">
        <h1 className="text-xl font-bold">AI Grader</h1>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* User info */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-primary/30 flex items-center justify-center">
            <span className="text-lg font-semibold">{userInitials}</span>
          </div>
          <div>
            <p className="font-medium">{`${user.firstName} ${user.lastName}`}</p>
            <p className="text-sm text-gray-300">
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4">
        <ul className="space-y-2">
          <li className={navItemClasses("/")}>
            <Link href="/" onClick={onClose} className="flex items-center">
              <Home className="h-5 w-5 mr-3" />
              <span>Dashboard</span>
            </Link>
          </li>

          <li className={navItemClasses("/exams")}>
            <Link href="/exams" onClick={onClose} className="flex items-center">
              <FileText className="h-5 w-5 mr-3" />
              <span>Exam History</span>
            </Link>
          </li>

          <li className={navItemClasses("/profile")}>
            <Link href="/profile" onClick={onClose} className="flex items-center">
              <User className="h-5 w-5 mr-3" />
              <span>Profile</span>
            </Link>
          </li>
        </ul>
      </nav>

      {/* Logout */}
      <div className="absolute bottom-0 left-0 w-full p-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="flex items-center text-gray-300 hover:text-white transition-colors"
        >
          <LogOut className="h-5 w-5 mr-3" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
