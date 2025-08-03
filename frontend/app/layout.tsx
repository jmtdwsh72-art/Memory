import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import ErrorBoundary from '@/components/error-boundary';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'KenKai Assistant - Premium AI Memory Assistant',
  description: 'Multi-agent AI assistant with persistent memory and specialized capabilities',
  keywords: ['AI', 'assistant', 'memory', 'agents', 'research', 'productivity'],
  authors: [{ name: 'KenKai Team' }],
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ErrorBoundary componentName="RootLayout" showErrorDetails={process.env.NODE_ENV === 'development'}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}