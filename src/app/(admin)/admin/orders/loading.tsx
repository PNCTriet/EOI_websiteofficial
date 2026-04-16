export default function AdminOrdersLoading() {
  return (
    <div className="animate-pulse p-5 md:p-6">
      <div className="h-8 w-32 rounded bg-eoi-border" />
      <div className="mt-4 flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-10 w-24 rounded-full bg-eoi-border" />
        ))}
      </div>
      <div className="mt-6 h-72 rounded-2xl border border-eoi-border bg-eoi-surface" />
    </div>
  );
}
