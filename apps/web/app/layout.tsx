import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PAYDAY HR Cloud CH",
  description: "Piattaforma enterprise HR con payroll svizzero"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
