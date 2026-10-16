import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { UploadForm } from "./UploadForm";

const meta = { title: "Components/UploadForm", component: UploadForm, tags: ["autodocs"] } satisfies Meta<typeof UploadForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
