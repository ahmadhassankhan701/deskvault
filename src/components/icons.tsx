import type { SVGProps } from "react";

export function DeskVaultIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v1.5" />
      <path d="M12 19.5V21" />
      <path d="M4.93 4.93l1.06 1.06" />
      <path d="m17.01 17.01 1.06 1.06" />
      <path d="m4.93 19.07 1.06-1.06" />
      <path d="m17.01 6.99 1.06-1.06" />
    </svg>
  );
}
