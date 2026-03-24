export default function ProductDetailLoading() {
  return (
    <div className="animate-pulse px-5 pb-10 pt-2 md:px-6">
      <div className="mx-auto max-w-lg">
        <div className="h-[260px] rounded-2xl bg-eoi-border" />
      </div>
      <div className="mx-auto mt-6 max-w-lg space-y-4">
        <div className="h-6 w-20 rounded-full bg-eoi-border" />
        <div className="h-8 w-4/5 rounded bg-eoi-border" />
        <div className="h-4 w-1/2 rounded bg-eoi-border" />
        <div className="h-10 w-36 rounded bg-eoi-border" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-eoi-border" />
          <div className="h-3 w-full rounded bg-eoi-border" />
          <div className="h-3 w-2/3 rounded bg-eoi-border" />
        </div>
        <div className="flex gap-3 pt-2">
          <div className="h-12 flex-1 rounded-full bg-eoi-border" />
          <div className="h-12 w-12 rounded-full bg-eoi-border" />
        </div>
      </div>
    </div>
  );
}
