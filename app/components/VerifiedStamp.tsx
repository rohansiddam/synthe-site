type VerifiedStampProps = {
  className?: string;
};

export function VerifiedStamp({ className = "" }: VerifiedStampProps) {
  return (
    <span
      className={`inline-block border-2 border-human text-human rounded-md px-2 py-0 font-mono text-xs font-bold uppercase tracking-[0.1em] ${className}`}
      style={{ transform: "rotate(-3deg)" }}
    >
      verified
    </span>
  );
}
