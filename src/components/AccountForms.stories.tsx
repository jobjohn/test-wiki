import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MfaManage, PasswordForm, ProfileForm } from "./AccountForms";

const meta = { title: "Forms/AccountForms", component: ProfileForm, tags: ["autodocs"], args: { displayName: "Wiki 管理者" } } satisfies Meta<typeof ProfileForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Profile: Story = { decorators: [(Story) => <div className="max-w-md"><Story /></div>] };
export const Password: Story = { render: () => <PasswordForm cancelable /> };
export const PasswordFirstLogin: Story = { render: () => <PasswordForm cancelable={false} />, parameters: { docs: { description: { story: "初回ログイン時はキャンセルできない。" } } } };
export const MfaEnabled: Story = { render: () => <MfaManage requireMfa={false} /> };
export const MfaRequired: Story = { render: () => <MfaManage requireMfa />, parameters: { docs: { description: { story: "全員必須の設定のときは、無効化の操作を出さない。" } } } };
