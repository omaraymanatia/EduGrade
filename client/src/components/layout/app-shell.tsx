import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  const closeSidebar = () => {
    setSidebarOpen(false);
  };
  
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - hidden on mobile, visible on md and up */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>
      
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-30" onClick={closeSidebar}></div>
          <Sidebar isMobile onClose={closeSidebar} />
        </>
      )}
      
      {/* Main Content */}
      <main className="flex flex-col flex-1 w-0 overflow-hidden">
        <Topbar onToggleSidebar={toggleSidebar} />
        <div className="flex-1 overflow-auto focus:outline-none bg-gray-50">
          {children}
        </div>
      </main>
    </div>
  );
}
