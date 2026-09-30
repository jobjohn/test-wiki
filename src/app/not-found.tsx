import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty-state" style={{ margin: "48px auto", maxWidth: 480 }}>
      <h1>404</h1>
      <p>お探しのページは存在しないか、移動または削除された可能性があります。</p>
      <Link href="/" className="button button-primary">
        ホームに戻る
      </Link>
    </div>
  );
}
