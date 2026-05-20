import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PalletFlow – 3D Pallet Packing Optimizer",
  description:
    "Modern pallet packing optimizer with 3D visualization and efficiency insights.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
