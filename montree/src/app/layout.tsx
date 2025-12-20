import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Montessori Tree',
  description: 'Interactive Montessori curriculum visualization',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

