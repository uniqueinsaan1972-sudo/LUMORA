import './globals.css';
import '@fontsource-variable/inter';
import '@fontsource-variable/manrope';
import '@fontsource/noto-nastaliq-urdu/400.css';
import '@fontsource/noto-nastaliq-urdu/700.css';
import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/Providers';
export const metadata: Metadata = { title: 'LUMORA — Where Learning Meets Possibility', description: 'Make learning easier. Make improvement possible.' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#060a18' };
// Dark is the signature theme: default to dark unless the user explicitly chose light.
const themeScript = `try{var t=localStorage.getItem('lumora-theme');if(t!=='light')document.documentElement.classList.add('dark')}catch(e){document.documentElement.classList.add('dark')}`;
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="antialiased">
        <div className="aurora" aria-hidden><i /><i /><i /></div>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
