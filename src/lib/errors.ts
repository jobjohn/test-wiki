/** 入力内容の不備（画面にそのまま表示できるメッセージ） */
export class ValidationError extends Error {
  readonly messages: string[];
  constructor(messages: string | string[]) {
    const list = Array.isArray(messages) ? messages : [messages];
    super(list.join(" / "));
    this.messages = list;
  }
}

/** 他の人が先に更新していた（楽観ロックの競合） */
export class StaleError extends Error {
  constructor() {
    super("他のユーザーがこのページを先に更新しました。");
  }
}

export class NotFoundError extends Error {}
