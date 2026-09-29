import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daybook — A little space of your own",
  description:
    "A calmer place for your tasks, thoughts, and everything in between.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
