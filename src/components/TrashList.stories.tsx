import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { EmptyTrashButton, TrashList } from "./TrashList";

const meta = {
  title: "Components/TrashList",
  component: TrashList,
  tags: ["autodocs"],
  args: {
    isAdmin: false,
    items: [
      { id: 1, kind: "page", title: "認証 API 仕様", deletedByName: "山田 太郎", deletedAt: "2026-10-10T05:00:00.000Z", daysLeft: 23 },
      { id: 2, kind: "bookmark", title: "Example Domain", deletedByName: "hana@example.org", deletedAt: "2026-09-20T05:00:00.000Z", daysLeft: 3 },
      { id: 3, kind: "upload", title: "構成図.png", deletedByName: null, deletedAt: "2026-09-18T05:00:00.000Z", daysLeft: 1 },
    ],
  },
} satisfies Meta<typeof TrashList>;
export default meta;
type Story = StoryObj<typeof meta>;

/** 編集できる人: 復元だけ */
export const Default: Story = {};
/** 管理者: 完全削除も出る */
export const Admin: Story = { args: { isAdmin: true } };
export const EmptyTrashConfirm: Story = { args: { items: [] }, render: () => <EmptyTrashButton count={3} /> };
