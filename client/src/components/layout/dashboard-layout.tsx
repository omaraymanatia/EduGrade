import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, Gauge, LogOut, Menu, User, X } from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { getInitials } from "@/lib/utils";
import Logo from "../logo";

const sidebarItems = {
  professor: [
    {
      title: "Dashboard",
      href: "/professor",
      icon: <Gauge className="h-5 w-5" />,
    },
    {
      title: "Exams",
      href: "/professor/exams",
      icon: <FileText className="h-5 w-5" />,
    },
    {
      title: "Profile",
      href: "/professor/profile",
      icon: <User className="h-5 w-5" />,
    },
  ],
  student: [
    {
      title: "Dashboard",
      href: "/student",
      icon: <Gauge className="h-5 w-5" />,
    },
    {
      title: "My Exams",
      href: "/student/exams",
      icon: <FileText className="h-5 w-5" />,
    },
    {
      title: "Profile",
      href: "/student/profile",
      icon: <User className="h-5 w-5" />,
    },
  ],
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();

  // Determine if the user is a student or professor and get the appropriate sidebar items
  const role = user?.role || "student";
  const items =
    role === "professor" ? sidebarItems.professor : sidebarItems.student;

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen bg-light-50">
      <nav className="bg-white border-b border-gray-200 fixed z-30 w-full">
        <div className="px-3 py-3 lg:px-5 lg:pl-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-start">
              <button
                onClick={toggleSidebar}
                aria-expanded={sidebarOpen}
                className="md:hidden p-2 mr-2 text-gray-600 rounded cursor-pointer hover:bg-light"
              >
                <Menu className="h-5 w-5" />
              </button>
              <Link href={`/${role}`} className="flex items-center">
                <Logo className="h-8 w-8 text-primary mr-2" />
                <span className="self-center text-xl font-bold text-primary whitespace-nowrap">
                  AI Grader
                </span>
              </Link>
            </div>
            <div className="flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-white text-sm">
                        {user && getInitials(user.firstName, user.lastName)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/${role}/profile`}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => logout()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed top-0 left-0 z-40 w-64 h-screen pt-20 transition-transform bg-primary border-r border-primary-800 md:block`}
      >
        <div className="h-full px-3 py-4 overflow-y-auto flex flex-col">
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden absolute top-3 right-3 text-white p-1 rounded-md hover:bg-primary-800"
          >
            <X className="h-5 w-5" />
          </button>
          <ul className="space-y-2 font-medium flex-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center p-2 rounded-lg ${
                    location === item.href
                      ? "bg-primary-600 text-white"
                      : "text-white hover:bg-primary-700"
                  }`}
                >
                  <span className="min-w-[24px]">{item.icon}</span>
                  <span className="ml-3">{item.title}</span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Logout Button */}
          <div className="pt-2 mt-auto border-t border-primary-700">
            <button
              onClick={() => logout()}
              className="flex w-full items-center p-2 rounded-lg text-white hover:bg-primary-700"
            >
              <span className="min-w-[24px]">
                <LogOut className="h-5 w-5" />
              </span>
              <span className="ml-3">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-900 bg-opacity-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="md:ml-64 pt-16">{children}</div>
    </div>
  );
}
