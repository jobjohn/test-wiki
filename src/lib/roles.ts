export const ROLES = { admin: "管理者", editor: "編集者", viewer: "閲覧者" } as const;
export type Role = keyof typeof ROLES;
