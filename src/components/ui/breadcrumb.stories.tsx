import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Fragment } from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "./breadcrumb";

const meta = { title: "UI/Breadcrumb", component: Breadcrumb, tags: ["autodocs"] } satisfies Meta<typeof Breadcrumb>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Breadcrumb>
      <BreadcrumbList>
        {["ホーム", "開発", "API"].map((label) => (
          <Fragment key={label}>
            <BreadcrumbItem>
              <BreadcrumbLink href="#">{label}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </Fragment>
        ))}
        <BreadcrumbItem>
          <BreadcrumbPage>認証 API 仕様</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
};
