import { ReactNode, useState } from "react";
import { Sidebar } from "./sidebar";
import { Menu, X } from "lucide-react";

type DashboardLayoutProps = {
  children: ReactNode;
  title: string;
  subtitle?: string;
};

export function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="h-screen flex flex-col md:flex-row">
      {/* Sidebar - hidden on mobile unless toggled */}
      <div className={`${mobileMenuOpen ? 'fixed inset-0 z-50' : 'hidden'} md:relative md:block`}>
        <Sidebar onClose={() => setMobileMenuOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 md:ml-64 flex flex-col">
        {/* Mobile header */}
        <header className="bg-white py-4 px-6 shadow md:hidden">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-primary">AI Grader</h1>
            <button onClick={toggleMobileMenu} className="text-gray-600 focus:outline-none">
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 p-6 overflow-auto bg-gray-50">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
