import type { Metadata } from "next";
import "./globals.css";
import "./dark-theme.css";
export const metadata: Metadata = {
  title: "Pulso · Tu espacio personal",
  description:
    "Tu agenda, vencimientos, finanzas, hábitos, salud y gimnasio en un espacio privado.",
  icons: { icon: "/favicon.svg" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
