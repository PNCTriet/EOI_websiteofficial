export default function AdminLoading() {
  return (
    <div className="animate-pulse p-5 md:p-6">
      <div className="h-8 w-40 rounded bg-eoi-border" />
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 rounded-2xl border border-eoi-border bg-white"
          />
        ))}
      </div>
      <div className="mt-8 h-64 rounded-2xl border border-eoi-border bg-white" />
    </div>
  );
}
