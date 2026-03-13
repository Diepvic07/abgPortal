'use client';

interface ScrollCtaButtonProps {
  targetId: string;
  label: string;
  className?: string;
}

export function ScrollCtaButton({ targetId, label, className }: ScrollCtaButtonProps) {
  const handleClick = () => {
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <button onClick={handleClick} className={className}>
      {label}
    </button>
  );
}
