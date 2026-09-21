import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Footer } from "@/components/Footer";
import { Assistant } from "@/components/Assistant";
import { VpnNotice } from "@/components/VpnNotice";
import { TiltProvider } from "@/components/TiltProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { CatalogSync } from "@/components/CatalogSync";
import { MaintenanceBanner } from "@/components/MaintenanceBanner";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CatalogSync />
      <MaintenanceBanner />
      <Header />
      {children}
      <BottomNav />
      <Footer />
      <Assistant />
      <VpnNotice />
      <TiltProvider />
    </AuthProvider>
  );
}
