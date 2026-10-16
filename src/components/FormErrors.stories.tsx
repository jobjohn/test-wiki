import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FormErrors } from "./FormErrors";

const meta = { title: "Components/FormErrors", component: FormErrors, tags: ["autodocs"] } satisfies Meta<typeof FormErrors>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = { args: { errors: ["ユーザー名またはパスワードが正しくありません。"] } };
export const Multiple: Story = { args: { errors: ["タイトルを入力してください", "同じタイトルのページが既にあります"] } };
export const Empty: Story = { args: { errors: [] }, parameters: { docs: { description: { story: "エラーがなければ何も表示しない。" } } } };
