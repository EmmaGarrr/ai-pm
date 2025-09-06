"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export function Header({
  title,
  backHref,
  children,
}: {
  title: string;
  backHref?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between border-b bg-background px-6 py-4">
      <div className="flex items-center gap-4">
        {backHref && (
          <Link href={backHref} aria-label="Go back">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </header>
  );
}