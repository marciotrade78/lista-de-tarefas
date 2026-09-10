import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Em dia · Minhas tarefas",
  description: "Organize tarefas, prioridades e compromissos em um só lugar.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
