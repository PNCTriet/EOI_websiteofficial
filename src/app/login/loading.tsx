export default function LoginLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-eoi-bg px-5">
      <div className="w-full max-w-md animate-pulse rounded-2xl border border-eoi-border bg-white p-8">
        <div className="mx-auto h-10 w-24 rounded bg-eoi-border" />
        <div className="mx-auto mt-2 h-3 w-32 rounded bg-eoi-border" />
        <div className="mt-8 space-y-4">
          <div className="h-12 rounded-[10px] bg-eoi-border" />
          <div className="h-12 rounded-[10px] bg-eoi-border" />
          <div className="h-12 rounded-full bg-eoi-border" />
        </div>
      </div>
    </div>
  );
}
