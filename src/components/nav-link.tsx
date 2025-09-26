"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const navLinkVariants = cva(
  "flex items-center gap-3 rounded-md px-3 py-2 text-muted-foreground transition-all hover:text-primary",
  {
    variants: {
      size: {
        default: "text-sm",
        sm: "flex-col h-auto py-1 px-2 text-xs",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

interface NavLinkProps extends React.ComponentProps<typeof Link>, VariantProps<typeof navLinkVariants> {
  children: React.ReactNode;
}

export function NavLink({ href, size, children, ...props }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        'group flex w-full items-center gap-2 rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
        isActive && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground',
        size === 'sm' && 'flex-col h-auto py-1 px-2 text-xs gap-1'
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
