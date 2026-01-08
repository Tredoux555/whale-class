export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No auth check - just render children
  return <>{children}</>;
}
