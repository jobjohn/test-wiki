export const ROLES = { general: "一般", admin: "管理者" } as const;
export type Role = keyof typeof ROLES;

export const STATUSES = { active: "有効", disabled: "無効" } as const;
export type Status = keyof typeof STATUSES;
