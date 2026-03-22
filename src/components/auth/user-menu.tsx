"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRef } from "react";

interface UserMenuProps {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  signOutAction: () => Promise<void>;
}

function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserMenu({ name, email, image, signOutAction }: UserMenuProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <form ref={formRef} action={signOutAction} className="hidden" />
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-2 rounded-full p-0 border-0 bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A3D] focus-visible:ring-offset-2"
          aria-label="Menu utilisateur"
        >
          <Avatar className="h-8 w-8 border border-[#E8E4DE]">
            {image && <AvatarImage src={image} alt={name ?? "User"} />}
            <AvatarFallback className="bg-[#2D5A3D] text-white text-xs font-semibold">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-56 border-[#E8E4DE] rounded-xl shadow-md"
        >
          <div className="px-2 py-1.5">
            <div className="flex flex-col space-y-1">
              {name && (
                <p className="text-sm font-semibold text-[#2A2622]">{name}</p>
              )}
              {email && (
                <p className="text-xs text-[#7D766E] truncate">{email}</p>
              )}
            </div>
          </div>
          <DropdownMenuSeparator className="bg-[#E8E4DE]" />
          <DropdownMenuItem
            onClick={() => formRef.current?.requestSubmit()}
            className="text-sm cursor-pointer text-[#3D3832] hover:bg-[#F5F2EE] focus:bg-[#F5F2EE]"
          >
            Se déconnecter
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
