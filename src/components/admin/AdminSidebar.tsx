import { Home, Calendar, BarChart3, Mail, Settings, Palette, LogOut, Lock, FileText, UsersRound } from "lucide-react";
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
import { useFeatures } from "@/hooks/useFeatures";

export type DashboardSection = "home" | "events" | "analytics" | "users" | "email" | "settings" | "branding" | "templates";

// Map sidebar items to feature codes (null means always visible)
const featureMap: Partial<Record<DashboardSection, string>> = {
  analytics: "analytics",
  email: "auto_emails",
  branding: "custom_branding",
  templates: "templates",
};

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
  { id: "templates", label: "Plantillas", icon: FileText },
  { id: "settings", label: "Configuración", icon: Settings },
];

export function AdminSidebar({ activeSection, onSelect, branding, onLogout }: AdminSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { hasFeature, isSuperAdmin } = useFeatures();

  const allItems = branding.isProfessionalOnly
    ? [...navItems.slice(0, -1), { id: "branding" as DashboardSection, label: "Marca blanca", icon: Palette }, navItems[navItems.length - 1]]
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
              {allItems.map((item) => {
                const requiredFeature = featureMap[item.id];
                const isLocked = requiredFeature && !hasFeature(requiredFeature) && !isSuperAdmin;

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={activeSection === item.id}
                      onClick={() => !isLocked && onSelect(item.id)}
                      tooltip={isLocked ? `${item.label} — Disponible en planes superiores` : item.label}
                      className={isLocked ? "opacity-50 cursor-not-allowed" : ""}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                      {isLocked && <Lock className="h-3 w-3 ml-auto shrink-0 text-muted-foreground" />}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
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
