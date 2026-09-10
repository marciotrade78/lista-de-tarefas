import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegister from "@/components/sw-register";

export const metadata: Metadata = {
  title: "Em dia · Minhas tarefas",
  description: "Organize tarefas, prioridades e compromissos em um só lugar.",
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Em dia",
  },
};
export const viewport: Viewport = {
  themeColor: "#1868d6",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
