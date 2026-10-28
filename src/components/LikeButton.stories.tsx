import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LikeButton } from "./LikeButton";

const meta = {
  title: "Components/LikeButton",
  component: LikeButton,
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "ページの「いいね!」。ログインしている人ごとに 1 回付けられ、押すとすぐ数が切り替わる（Storybook では保存しない）。" } },
  },
} satisfies Meta<typeof LikeButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const NotLiked: Story = { args: { pageId: 1, initial: { count: 3, liked: false }, canLike: true } };
export const Liked: Story = { args: { pageId: 1, initial: { count: 4, liked: true }, canLike: true } };
export const Zero: Story = { args: { pageId: 1, initial: { count: 0, liked: false }, canLike: true } };
/** 未ログインの閲覧（ログインなしで閲覧を許可）。数だけを表示する */
export const Anonymous: Story = { args: { pageId: 1, initial: { count: 2, liked: false }, canLike: false } };
