export default function AdminOrderDetailLoading() {
  return (
    <div className="animate-pulse p-5 md:p-6">
      <div className="h-5 w-40 rounded bg-eoi-border" />
      <div className="mt-4 h-8 w-56 rounded bg-eoi-border" />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="h-48 rounded-2xl border border-eoi-border bg-eoi-surface" />
        <div className="h-48 rounded-2xl border border-eoi-border bg-eoi-surface" />
      </div>
      <div className="mt-6 h-56 rounded-2xl border border-eoi-border bg-eoi-surface" />
    </div>
  );
}
