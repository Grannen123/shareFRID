import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CheckSquare,
  Receipt,
  BookOpen,
  Contact,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/customers", label: "Kunder", icon: Users },
  { to: "/assignments", label: "Uppdrag", icon: FolderKanban },
  { to: "/tasks", label: "Uppgifter", icon: CheckSquare },
  { to: "/billing", label: "Fakturering", icon: Receipt },
  { to: "/contacts", label: "Kontakter", icon: Contact },
  { to: "/notes", label: "Anteckningar", icon: StickyNote },
  { to: "/knowledge", label: "Kunskapsbank", icon: BookOpen },
];

export function Sidebar() {
  return (
    <aside
      className="fixed left-0 top-0 z-40 h-screen w-64 bg-warm-white border-r border-sand"
      role="navigation"
      aria-label="Huvudnavigation"
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center px-6 border-b border-sand">
          <h1 className="text-xl font-display font-bold text-sage">
            Grannfrid
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4" aria-label="Sidmeny">
          <ul className="space-y-1" role="list">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-sage/10 text-sage-dark"
                        : "text-ash hover:bg-sand hover:text-charcoal",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className="h-5 w-5" aria-hidden="true" />
                      <span aria-current={isActive ? "page" : undefined}>
                        {item.label}
                      </span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-sand p-4">
          <p className="text-xs text-ash text-center">
            Grannfrid AB © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </aside>
  );
}
