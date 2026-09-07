export function Logo({ className = "" }: { className?: string }) {
  return <img className={`logo-mark ${className}`} src="/Logo.svg" alt="Waypic" width={78} height={24} />;
}
