/** ブラウザから /api/uploads へファイルを送る（中身をそのまま本文にして、サーバー側でディスクへ流し込めるようにする） */
export const uploadFile = (file: File) =>
  fetch("/api/uploads", {
    method: "POST",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream", "X-File-Name": encodeURIComponent(file.name) },
    credentials: "same-origin",
  });
