export default function AdminProductsLoading() {
  return (
    <div className="animate-pulse p-5 md:p-6">
      <div className="flex justify-between">
        <div className="h-8 w-32 rounded bg-eoi-border" />
        <div className="h-11 w-28 rounded-full bg-eoi-border" />
      </div>
      <div className="mt-6 h-80 rounded-2xl border border-eoi-border bg-white" />
    </div>
  );
}
