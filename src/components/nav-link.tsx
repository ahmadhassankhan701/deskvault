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
        navLinkVariants({ size }),
        isActive && "bg-muted text-primary",
        size === 'sm' && 'gap-1'
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
