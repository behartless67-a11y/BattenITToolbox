import type { Metadata } from 'next'
import { Libre_Baskerville, Inter } from 'next/font/google'
import './globals.css'

const serif = Libre_Baskerville({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Batten UVA IT Dashboard',
  description: 'Unified IT management dashboard for Jamf, Intune, Qualys, and CoreView',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${serif.variable} ${sans.variable} font-sans bg-background antialiased`}>
        {children}
      </body>
    </html>
  )
}
