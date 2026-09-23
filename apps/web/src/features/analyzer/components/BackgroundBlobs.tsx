export function BackgroundBlobs() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] overflow-hidden">
      <div className="absolute left-1/4 top-0 h-72 w-72 animate-blob rounded-full bg-brand-400/20 blur-3xl" />
      <div className="absolute right-1/4 top-10 h-72 w-72 animate-blob rounded-full bg-orange-300/20 blur-3xl [animation-delay:4s]" />
      <div className="absolute left-1/2 top-24 h-72 w-72 animate-blob rounded-full bg-rose-300/20 blur-3xl [animation-delay:8s]" />
    </div>
  );
}
