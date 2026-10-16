import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChevronRight } from "lucide-react";
import { Button } from "./button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";

const meta = { title: "UI/Collapsible", component: Collapsible, tags: ["autodocs"] } satisfies Meta<typeof Collapsible>;
export default meta;
type Story = StoryObj<typeof meta>;

const render: Story["render"] = (args) => (
  <Collapsible {...args} className="group/c max-w-md">
    <CollapsibleTrigger asChild>
      <Button variant="ghost" className="-ml-3">
        <ChevronRight className="transition-transform group-data-[state=open]/c:rotate-90" aria-hidden />
        この版の内容
      </Button>
    </CollapsibleTrigger>
    <CollapsibleContent className="text-sm text-muted-foreground">開くと表示される内容です。</CollapsibleContent>
  </Collapsible>
);
export const Closed: Story = { render };
export const Open: Story = { args: { defaultOpen: true }, render };
