export default function StoreLoading() {
  return (
    <div className="space-y-8 px-5 py-6 md:px-6">
      <div className="animate-pulse rounded-2xl bg-eoi-ink/90 px-5 py-8 md:px-8 md:py-10">
        <div className="h-5 w-24 rounded-full bg-white/20" />
        <div className="mt-4 h-10 max-w-xs rounded-lg bg-white/10" />
        <div className="mt-3 h-4 max-w-sm rounded bg-white/10" />
        <div className="mt-6 h-11 w-40 rounded-full bg-white/20" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex flex-shrink-0 flex-col items-center gap-2"
          >
            <div className="h-14 w-14 animate-pulse rounded-[18px] bg-eoi-border" />
            <div className="h-3 w-12 animate-pulse rounded bg-eoi-border" />
          </div>
        ))}
      </div>
      <div>
        <div className="mb-4 h-6 w-28 animate-pulse rounded bg-eoi-border" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-eoi-border bg-eoi-surface"
            >
              <div className="h-[140px] animate-pulse bg-eoi-border" />
              <div className="space-y-2 p-3">
                <div className="h-4 w-3/4 animate-pulse rounded bg-eoi-border" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-eoi-border" />
                <div className="flex justify-between pt-1">
                  <div className="h-4 w-16 animate-pulse rounded bg-eoi-border" />
                  <div className="h-7 w-7 animate-pulse rounded-full bg-eoi-border" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
