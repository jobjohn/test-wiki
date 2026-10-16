import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";

const meta = { title: "UI/Card", component: Card, tags: ["autodocs"] } satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>最近更新されたページ</CardTitle>
        <CardDescription>直近 10 件の更新です。</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm">
            編集
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p>カードの本文がここに入ります。</p>
      </CardContent>
      <CardFooter>
        <Button>保存</Button>
      </CardFooter>
    </Card>
  ),
};
