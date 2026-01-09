// Simple teacher layout - NO Montree auth required
// Teachers log in with name + password "123" stored in localStorage

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No server-side auth check - pages handle their own localStorage check
  return <>{children}</>;
}
