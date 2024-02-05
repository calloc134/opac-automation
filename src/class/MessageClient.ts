// EitherパターンとしてResultを利用したいため、neverthrowを採用
import { Result, ok, err } from "neverthrow";
// リトライありのfetchを利用
import { retryFetch } from "../utils/retryFetch";

/**
 * メッセージクライアントの型
 * @typedef {Object} MessageClientType
 * @property {string} webhook_url - 送信先のwebhookのURL
 * @property {Function} send - メッセージを送信する関数
 * @property {string} message - 送信するメッセージ
 * @property {Promise<Result<Response, { status: number; statusText: string }>>} - 送信結果
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
 * @param {Object} options - オプション
 * @param {string} options.webhook_url - 送信先のwebhookのURL
 * @returns {MessageClientType} メッセージクライアント
 */
const initMessageClient = ({ webhook_url }: { webhook_url: string }) => {
  const MessageClient: MessageClientType = {
    webhook_url,
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

  return MessageClient;
};

export { initMessageClient, MessageClientType };
