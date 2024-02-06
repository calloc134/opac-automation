// EitherパターンとしてResultを利用したいため、neverthrowを採用
import { Result } from "neverthrow";
// リトライありのfetchを利用
import { retryFetch } from "../utils/retryFetch";

/**
 * メッセージクライアントの型
 * @property webhook_url - 送信先のwebhookのURL
 * @property send - メッセージを送信する関数
 */
type MessageClientType = {
  webhook_url: string;
  send: (
    this: MessageClientType,
    message: string
  ) => Promise<Result<Response, { status: number; statusText: string }>>;
};

/**
 * メッセージクライアントを初期化する関数
 * @param webhook_url - 送信先のwebhookのURL
 * @returns メッセージクライアント
 */
const initMessageClient = ({
  webhook_url,
}: {
  webhook_url: string;
}): MessageClientType => {
  /**
   * メッセージクライアント
   */
  return {
    /**
     * 送信先のwebhookのURL
     */
    webhook_url,

    /**
     * メッセージを送信する関数
     * @param message - 送信するメッセージ
     * @returns - 送信結果
     * @example
     * const result = await MessageClient.send("Hello, world!");
     * if (result.isErr()) {
     *  console.error(result.error.statusText);
     * }
     * console.log("送信に成功しました");
     * console.log(result.value);
     */
    send: async function (this: MessageClientType, message: string) {
      const result = await retryFetch(this.webhook_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: message }),
      });

      return result;
    },
  };
};

export { initMessageClient, MessageClientType };
