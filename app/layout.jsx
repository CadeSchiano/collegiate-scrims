import './globals.css';

export const metadata = {
  title: 'Scrimnet — Collegiate Rocket League',
  description: 'Find collegiate Rocket League scrims without hunting through Discord.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
