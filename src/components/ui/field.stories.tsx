import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Input } from "./input";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet, FieldTitle } from "./field";
import { Switch } from "./switch";

const meta = { title: "UI/Field", component: Field, tags: ["autodocs"] } satisfies Meta<typeof Field>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Field className="max-w-md">
      <FieldLabel htmlFor="wikiName">Wiki の名前</FieldLabel>
      <Input id="wikiName" defaultValue="開発チーム Wiki" />
      <FieldDescription>ホーム画面の上部に表示されます。</FieldDescription>
    </Field>
  ),
};
export const Invalid: Story = {
  render: () => (
    <Field className="max-w-md" data-invalid>
      <FieldLabel htmlFor="title">タイトル</FieldLabel>
      <Input id="title" aria-invalid />
      <FieldError>タイトルを入力してください。</FieldError>
    </Field>
  ),
};
export const Group: Story = {
  render: () => (
    <FieldSet className="max-w-md">
      <FieldLegend>基本情報</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">表示名</FieldLabel>
          <Input id="name" />
        </Field>
        <FieldSeparator />
        <FieldLabel htmlFor="public">
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>ログインなしで閲覧を許可</FieldTitle>
              <FieldDescription>オンにすると、ログインしていない人もページを閲覧できます。</FieldDescription>
            </FieldContent>
            <Switch id="public" />
          </Field>
        </FieldLabel>
      </FieldGroup>
    </FieldSet>
  ),
};
