import { useState } from "react";
import { Bell, Menu, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const [searchFocused, setSearchFocused] = useState(false);
  
  return (
    <div className="relative z-10 flex flex-shrink-0 h-16 bg-white shadow">
      <button 
        onClick={onToggleSidebar}
        className="px-4 text-gray-500 border-r border-gray-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary md:hidden"
        aria-label="Open sidebar"
      >
        <Menu className="w-6 h-6" />
      </button>
      
      <div className="flex justify-between flex-1 px-4">
        <div className="flex flex-1">
          <div className="flex w-full md:ml-0">
            <div className={cn(
              "relative w-full text-gray-400 transition-colors",
              searchFocused ? "text-gray-600" : "focus-within:text-gray-600"
            )}>
              <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none pl-3">
                <Search className="w-5 h-5" />
              </div>
              <Input
                className="block w-full h-full py-2 pl-10 pr-3 text-gray-900 placeholder-gray-500 border-transparent focus:outline-none focus:ring-0 focus:border-transparent sm:text-sm"
                placeholder="Search exams, students..."
                type="search"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-center ml-4 md:ml-6">
          <button className="p-1 text-gray-400 bg-white rounded-full hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
            <span className="sr-only">View notifications</span>
            <Bell className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
