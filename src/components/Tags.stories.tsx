import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Tags } from "./Tags";

const meta = { title: "Components/Tags", component: Tags, tags: ["autodocs"] } satisfies Meta<typeof Tags>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { tags: [{ id: 1, name: "API" }, { id: 2, name: "認証" }, { id: 3, name: "手順書" }] } };
export const Empty: Story = { args: { tags: [] } };
