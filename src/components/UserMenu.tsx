"use client";

import { LogOut, Settings, User as UserIcon, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { logoutAction } from "@/actions/auth";

export function UserMenu({ name, username, roleName, isAdmin }: { name: string; username: string; roleName: string; isAdmin: boolean }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const close = (event: Event) => {
      if (ref.current?.open && !ref.current.contains(event.target as Node)) ref.current.open = false;
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const closeMenu = () => {
    if (ref.current) ref.current.open = false;
  };

  return (
    <details className="user-menu" ref={ref}>
      <summary className="icon-button" aria-label="ユーザーメニュー">
        <span className="avatar">{Array.from(name)[0]?.toUpperCase()}</span>
      </summary>
      <div className="dropdown">
        <div className="dropdown-header">
          <strong>{name}</strong>
          <span className="muted small">
            @{username}・{roleName}
          </span>
        </div>
        <Link href="/account" onClick={closeMenu}>
          <UserIcon size={18} aria-hidden />
          <span>アカウント</span>
        </Link>
        {isAdmin && (
          <>
            <Link href="/settings" onClick={closeMenu}>
              <Settings size={18} aria-hidden />
              <span>Wiki の設定</span>
            </Link>
            <Link href="/users" onClick={closeMenu}>
              <Users size={18} aria-hidden />
              <span>ユーザー管理</span>
            </Link>
          </>
        )}
        <form action={logoutAction}>
          <button type="submit" className="dropdown-button">
            <LogOut size={18} aria-hidden />
            <span>ログアウト</span>
          </button>
        </form>
      </div>
    </details>
  );
}
