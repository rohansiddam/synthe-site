type EyebrowProps = {
  children: React.ReactNode;
  className?: string;
};

export function Eyebrow({ children, className = "" }: EyebrowProps) {
  return (
    <p className={`font-mono text-[13px] font-medium text-human-text ${className}`}>
      {children}
    </p>
  );
}
