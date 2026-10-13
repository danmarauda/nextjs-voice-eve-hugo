"use client";

import { useEffect, useRef, useState, type ComponentPropsWithRef } from "react";
import { Dropdown } from "@heroui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Authenticated, Unauthenticated, AuthLoading, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  LogOut,
  MessageSquare,
  MessagesSquare,
  FolderOpen,
  Settings,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { initials } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Avatar, Separator } from "@/components/ui/misc";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useReducedMotion } from "@/components/motion/useReducedMotion";
import { useAuthTransition } from "@/components/providers/ConvexClientProvider";

interface MenuLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const BASE_LINKS: MenuLink[] = [
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/workspace", label: "Document workspace", icon: FolderOpen },
  { href: "/conversations", label: "Conversations", icon: MessagesSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

/**
 * UserMenu — HeroUI handles focus, keyboard navigation, dismissal, and portals.
 * Shows identity, app links, an admin link when relevant, and sign out.
 */
function UserMenu() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const {
    beginSignOut,
    canRunProtectedQueries,
    clearSignOut,
    isSigningOut,
  } = useAuthTransition();
  const me = useQuery(
    api.users.currentUser,
    canRunProtectedQueries ? {} : "skip",
  );
  const [open, setOpen] = useState(false);

  const name = me?.name ?? me?.email ?? "Account";
  const label = initials(me?.name, me?.email);
  const links = me?.role === "admin"
    ? [...BASE_LINKS, { href: "/admin", label: "Admin", icon: Shield }]
    : BASE_LINKS;

  async function handleSignOut() {
    if (isSigningOut) return;
    setOpen(false);
    beginSignOut();
    try {
      await signOut();
      router.replace("/");
      router.refresh();
    } catch {
      clearSignOut();
      toast.error("Could not sign out. Please try again.");
    }
  }

  return (
    <Dropdown isOpen={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        aria-label="Open account menu"
        disabled={isSigningOut}
        className="px-1.5 sm:pr-3"
      >
        <Avatar name={label} src={me?.image} className="size-7 text-sm" />
        <span className="hidden max-w-[12ch] truncate text-base text-text-secondary sm:block">
          {name}
        </span>
      </Button>
      <Dropdown.Popover placement="bottom end" className="liquid-glass w-64 overscroll-contain p-2">
        <div className="px-3 py-2">
          <p className="truncate text-base text-text-primary">{me?.name ?? "Signed in"}</p>
          {me?.email && <p className="truncate text-sm text-text-secondary">{me.email}</p>}
        </div>
        <Separator className="my-1" />
        <Dropdown.Menu aria-label="Account">
          <Dropdown.Section>
            {links.map(({ href, label: linkLabel, icon: Icon }) => (
              <Dropdown.Item
                key={href}
                id={href}
                href={href}
                textValue={linkLabel}
                className="min-h-11 rounded-2xl font-sans text-base"
                render={(props) => <Link {...(props as ComponentPropsWithRef<"a">)} href={href} />}
              >
                <Icon aria-hidden className="size-4 shrink-0 stroke-[1.5] text-text-secondary" />
                {linkLabel}
              </Dropdown.Item>
            ))}
          </Dropdown.Section>
          <Separator />
          <Dropdown.Item
            id="sign-out"
            textValue="Sign out"
            variant="danger"
            isDisabled={isSigningOut}
            onAction={() => { void handleSignOut(); }}
            className="min-h-11 rounded-2xl font-sans text-base"
          >
            <LogOut aria-hidden className="size-4 shrink-0 stroke-[1.5]" />
            {isSigningOut ? "Signing out..." : "Sign out"}
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

/**
 * TopNav — sticky header for the whole app. Logo at left; theme toggle and
 * auth-aware actions at right. Uses Convex's Authenticated / Unauthenticated
 * gates so the correct controls render without a flash.
 *
 * Motion: on mount the header contents gently fade and slide down once. The
 * sticky shell (border + backdrop blur) is left untouched so there's no layout
 * shift; only the inner row animates. Skipped under `prefers-reduced-motion`.
 */
export function TopNav() {
  const rowRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const row = rowRef.current;
    if (!row || reducedMotion) return;

    let cancelled = false;
    let anim: { revert: () => void } | null = null;
    void import("animejs").then(({ animate }) => {
      if (cancelled) return;
      anim = animate(row, {
        opacity: [0, 1],
        y: [-8, 0],
        duration: 520,
        ease: "out(3)",
      });
    });

    return () => {
      cancelled = true;
      anim?.revert();
    };
  }, [reducedMotion]);

  return (
    <header className="liquid-glass sticky top-0 z-40 w-full rounded-none border-x-0 border-t-0">
      <div
        ref={rowRef}
        className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6"
      >
        <Logo />
        <nav className="flex items-center gap-2" aria-label="Account and theme">
          <ThemeToggle />
          {/* AuthLoading reserves the account-control slot so the nav row width
              stays stable across the Convex auth handshake (no CLS). It renders
              on the server and the first client paint — matching markup — then
              resolves to the real control. */}
          <AuthLoading>
            <div
              aria-hidden
              className="size-11 animate-pulse rounded-full border border-border bg-surface-elevated/60"
            />
          </AuthLoading>
          <Authenticated>
            <UserMenu />
          </Authenticated>
          <Unauthenticated>
            <Link
              href="/sign-in"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className={buttonVariants({ variant: "primary", size: "sm" })}
            >
              Get started
            </Link>
          </Unauthenticated>
        </nav>
      </div>
    </header>
  );
}
