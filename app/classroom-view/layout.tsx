export default function ClassroomViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50">
      {children}
    </div>
  );
}
