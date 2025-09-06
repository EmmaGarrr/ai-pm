"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, MessageSquare, Settings, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const NavItem = ({
  children,
  label,
  active = false,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
}) => (
  <TooltipProvider delayDuration={0}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={active ? "secondary" : "ghost"}
          size="icon"
          className={`rounded-lg ${
            active ? "bg-primary/10 text-primary" : "text-muted-foreground"
          }`}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={5}>
        {label}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="inset-y-0 left-0 z-10 hidden w-16 flex-col border-r bg-background sm:flex">
      <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
        <div className="p-2 mb-5">
          <Folder className="h-8 w-8 text-primary" />
        </div>
        <Link href="/">
          <NavItem label="Projects" active={pathname === "/"}>
            <LayoutGrid className="h-5 w-5" />
          </NavItem>
        </Link>
        <NavItem label="Chats">
          <MessageSquare className="h-5 w-5" />
        </NavItem>
      </nav>
      <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
        <NavItem label="Settings">
          <Settings className="h-5 w-5" />
        </NavItem>
        <div className="mt-4">
          <Avatar className="h-9 w-9">
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        </div>
      </nav>
    </aside>
  );
}