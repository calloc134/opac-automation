import { retryFetch } from "../utils/retryFetch";

// メッセージを送信するためのクロージャ
const useSender = ({ webhook_url }: { webhook_url: string }) => {
  // コンテキストを定義
  const context = {
    webhook_url,
  };

  // データの送信を行う関数の定義
  const send = async (message: string) => {
    const result = await retryFetch(context.webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: message }),
    });

    if (!result.ok) {
      throw new Error(result.statusText);
    }

    return result;
  };

  return { send };
};

export { useSender };
