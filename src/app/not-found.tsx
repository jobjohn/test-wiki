import { FileQuestion } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

export default function NotFound() {
  return (
    <Empty className="mx-auto my-16 max-w-md">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileQuestion aria-hidden />
        </EmptyMedia>
        <EmptyTitle>404</EmptyTitle>
        <EmptyDescription>お探しのページは存在しないか、移動または削除された可能性があります。</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link href="/">ホームに戻る</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
