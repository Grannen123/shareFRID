import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  FileText,
  CheckSquare,
  Receipt,
  BookOpen,
  Globe,
  Settings,
  Building,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui";

const navItems = [
  { label: "Översikt", path: "/", icon: LayoutDashboard },
  { label: "Kunder", path: "/kunder", icon: Building2 },
  { label: "Ärenden", path: "/arenden", icon: FileText },
  { label: "Arbetsyta", path: "/arbetsyta", icon: CheckSquare },
  { label: "Fakturering", path: "/fakturering", icon: Receipt },
  { label: "Kunskapsbank", path: "/kunskapsbank", icon: BookOpen },
  { label: "Intranät", path: "/intranat", icon: Globe },
];

const bottomNavItems = [
  { label: "Grannfrid AB", path: "/grannfrid-ab", icon: Building },
  { label: "Inställningar", path: "/installningar", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[240px] border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">G</span>
          </div>
          <span className="font-semibold text-lg text-gray-900">Grannfrid</span>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-64px)]">
        <nav className="flex flex-col gap-1 p-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-gray-200 p-4">
          <nav className="flex flex-col gap-1">
            {bottomNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </ScrollArea>
    </aside>
  );
}
