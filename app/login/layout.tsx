// Login page has its own layout — no Nav, no banner
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
