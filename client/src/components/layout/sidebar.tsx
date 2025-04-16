import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  FileText, 
  Users, 
  Info, 
  Settings, 
  BarChart4, 
  LogOut,
  UserCog,
  PieChart,
  UserSquare
} from "lucide-react";

export function Sidebar({ isMobile = false, onClose }: { isMobile?: boolean, onClose?: () => void }) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  
  if (!user) return null;
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  const handleNavClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };
  
  return (
    <div className={cn(
      "flex flex-col w-64 border-r border-gray-200 bg-white h-full",
      isMobile && "fixed inset-0 z-40"
    )}>
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-primary">ExamSmart</h1>
      </div>
      
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {/* Professor Navigation */}
        {user.role === "professor" && (
          <div className="space-y-1">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Professor</div>
            <NavItem 
              href="/professor" 
              icon={<Home className="w-5 h-5 mr-2" />}
              isActive={location === "/professor"}
              onClick={handleNavClick}
            >
              Dashboard
            </NavItem>
            <NavItem 
              href="#exams" 
              icon={<FileText className="w-5 h-5 mr-2" />}
              onClick={handleNavClick}
            >
              Exams
            </NavItem>
            <NavItem 
              href="#students" 
              icon={<Users className="w-5 h-5 mr-2" />}
              onClick={handleNavClick}
            >
              Students
            </NavItem>
            <NavItem 
              href="#ai-detection" 
              icon={<BarChart4 className="w-5 h-5 mr-2" />}
              onClick={handleNavClick}
            >
              AI Detection Settings
            </NavItem>
          </div>
        )}
        
        {/* Student Navigation */}
        {user.role === "student" && (
          <div className="space-y-1">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Student</div>
            <NavItem 
              href="/student" 
              icon={<Home className="w-5 h-5 mr-2" />}
              isActive={location === "/student"}
              onClick={handleNavClick}
            >
              Dashboard
            </NavItem>
            <NavItem 
              href="#submissions" 
              icon={<FileText className="w-5 h-5 mr-2" />}
              onClick={handleNavClick}
            >
              Submissions
            </NavItem>
            <NavItem 
              href="#grades" 
              icon={<BarChart4 className="w-5 h-5 mr-2" />}
              onClick={handleNavClick}
            >
              Grades
            </NavItem>
          </div>
        )}
        
        {/* Admin Navigation */}
        {user.role === "admin" && (
          <div className="space-y-1">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Admin</div>
            <NavItem 
              href="/admin" 
              icon={<Home className="w-5 h-5 mr-2" />}
              isActive={location === "/admin"}
              onClick={handleNavClick}
            >
              Dashboard
            </NavItem>
            <NavItem 
              href="#system" 
              icon={<Settings className="w-5 h-5 mr-2" />}
              onClick={handleNavClick}
            >
              System Settings
            </NavItem>
            <NavItem 
              href="#users" 
              icon={<UserCog className="w-5 h-5 mr-2" />}
              onClick={handleNavClick}
            >
              User Management
            </NavItem>
            <NavItem 
              href="#analytics" 
              icon={<PieChart className="w-5 h-5 mr-2" />}
              onClick={handleNavClick}
            >
              Analytics
            </NavItem>
          </div>
        )}
        
        {/* Common Links */}
        <div className="space-y-1 mt-4">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">General</div>
          <NavItem 
            href="#profile" 
            icon={<UserSquare className="w-5 h-5 mr-2" />}
            onClick={handleNavClick}
          >
            Profile
          </NavItem>
          <NavItem 
            href="/about" 
            icon={<Info className="w-5 h-5 mr-2" />}
            isActive={location === "/about"}
            onClick={handleNavClick}
          >
            About
          </NavItem>
        </div>
      </nav>
      
      {/* User Profile */}
      <div className="flex items-center p-4 border-t border-gray-200">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white font-semibold">
          {user.fullName.charAt(0)}
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-gray-700">{user.fullName}</p>
          <p className="text-xs font-medium text-gray-500 capitalize">{user.role}</p>
        </div>
        <button 
          className="p-1 ml-auto text-gray-400 rounded-full hover:text-gray-500 hover:bg-gray-100"
          onClick={handleLogout}
          aria-label="Log out"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function NavItem({ 
  href, 
  icon, 
  children, 
  isActive = false,
  onClick
}: { 
  href: string; 
  icon: React.ReactNode; 
  children: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link href={href}>
      <a
        className={cn(
          "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
          isActive 
            ? "bg-primary bg-opacity-10 text-primary" 
            : "text-gray-700 hover:bg-gray-100"
        )}
        onClick={onClick}
      >
        {icon}
        {children}
      </a>
    </Link>
  );
}
