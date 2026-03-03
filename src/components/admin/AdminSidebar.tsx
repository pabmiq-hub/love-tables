import { Home, Calendar, BarChart3, Mail, Settings, Palette, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { BrandedLogo } from "@/components/BrandedHeader";

export type DashboardSection = "home" | "events" | "analytics" | "email" | "account" | "branding";

interface AdminSidebarProps {
  activeSection: DashboardSection;
  onSelect: (section: DashboardSection) => void;
  branding: {
    logoUrl: string | null;
    companyName: string | null;
    isProfessionalOnly: boolean;
    isWhiteLabel: boolean;
  };
  onLogout: () => void;
}

const navItems: { id: DashboardSection; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Inicio", icon: Home },
  { id: "events", label: "Eventos", icon: Calendar },
  { id: "analytics", label: "Analítica", icon: BarChart3 },
  { id: "email", label: "Email", icon: Mail },
  { id: "account", label: "Cuenta", icon: Settings },
];

export function AdminSidebar({ activeSection, onSelect, branding, onLogout }: AdminSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const allItems = branding.isProfessionalOnly
    ? [...navItems, { id: "branding" as DashboardSection, label: "Marca blanca", icon: Palette }]
    : navItems;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2 overflow-hidden">
          <BrandedLogo
            logoUrl={branding.logoUrl}
            companyName={branding.companyName}
            isWhiteLabel={branding.isWhiteLabel}
            className={collapsed ? "h-6 w-auto" : "h-8 w-auto max-w-[140px]"}
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {allItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeSection === item.id}
                    onClick={() => onSelect(item.id)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onLogout} tooltip="Cerrar sesión">
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
