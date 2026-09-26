export function ProductPlaceholder({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-12">
      <p className="text-sm font-semibold text-adora-blue">Adora</p>
      <h1 className="font-heading text-3xl font-bold tracking-tight text-adora-navy">{title}</h1>
      <p className="text-pretty text-muted-foreground">{body}</p>
    </div>
  );
}
