import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/context/ThemeContext'
import { NewOrderNotifier } from '@/components/NewOrderNotifier'

export const metadata: Metadata = {
  title: 'ATELIER • Omnichannel ERP & WMS',
  description: 'Enterprise apparel ERP, shelf-level warehouse management, and multi-boutique POS.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('atelier_admin_theme');
                  if (saved === 'light') {
                    document.documentElement.classList.add('light');
                    document.documentElement.classList.remove('dark');
                    document.documentElement.setAttribute('data-theme', 'light');
                    document.documentElement.style.colorScheme = 'light';
                  } else {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                    document.documentElement.setAttribute('data-theme', 'dark');
                    document.documentElement.style.colorScheme = 'dark';
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-chrome-950 text-zinc-100 font-sans antialiased selection:bg-chrome-800 transition-colors duration-200">
        <ThemeProvider>
          {children}
          <NewOrderNotifier />
        </ThemeProvider>
      </body>
    </html>
  )
}
