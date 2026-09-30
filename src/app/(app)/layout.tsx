import type { ReactNode } from "react";
import { ShellFrame } from "@/components/ShellFrame";
import { readFlash } from "@/lib/flash";
import { listFolders } from "@/lib/folders";
import { listPageOutlines } from "@/lib/pages";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { canEdit, isAdmin, ROLES } from "@/lib/users";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const settings = getSettings();
  const user = await getCurrentUser();

  // 見せてよい人にだけサイドバーの内容（ページ名）を渡す
  const tree = user || settings.publicRead ? { folders: listFolders(), pages: listPageOutlines() } : null;

  return (
    <ShellFrame
      wikiName={settings.wikiName}
      user={
        user && {
          name: user.name,
          username: user.username,
          roleName: ROLES[user.role],
          isAdmin: isAdmin(user),
          canEdit: canEdit(user),
        }
      }
      tree={tree}
      flash={await readFlash()}
    >
      {children}
    </ShellFrame>
  );
}
