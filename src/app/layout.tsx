import './globals.css'
import { Inter } from 'next/font/google'
import toast, { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'BRI EVENTS',
  description: 'This is BRI EVENTS related website',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster position="bottom-right" toastOptions={{ duration: 5000, removeDelay: 1000}} />
        </body>
    </html>
  )
}
