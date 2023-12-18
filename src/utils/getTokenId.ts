import { openam_url } from "../env";
import { retryFetch } from "./retryFetch";

// ログイン時のトークン取得
const getTokenId = async ({
  id,
  password,
}: {
  id: string;
  password: string;
}) => {
  console.log("[*] 一時トークンを取得します...");
  // まずログイン用の一時トークンの取得
  const result_1 = await retryFetch(`${openam_url}/json/authenticate`, {
    method: "POST",
  });

  if (!result_1.ok) {
    console.error("[!] エラーが発生しました");
    console.error("[*] レスポンスのテキストを表示します");
    console.error(await result_1.text());
    throw new Error(result_1.statusText);
  }

  const { authId } = (await result_1.json()) as {
    authId: string;
  };

  console.log("[*] 一時トークンを取得しました");
  console.log("[*] 本トークンを取得します...");

  // 一時トークンを使って本トークンを取得
  const result_2 = await retryFetch(`${openam_url}/json/authenticate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      authId,
      callbacks: [
        {
          type: "NameCallback",
          output: [
            {
              name: "prompt",
              value: "ユーザー名",
            },
          ],
          input: [
            {
              name: "IDToken1",
              value: id,
            },
          ],
        },
        {
          type: "PasswordCallback",
          output: [
            {
              name: "prompt",
              value: "パスワード",
            },
          ],
          input: [
            {
              name: "IDToken2",
              value: password,
            },
          ],
        },
      ],
    }),
  });

  if (!result_2.ok) {
    console.error("[!] エラーが発生しました");
    console.error("[*] レスポンスのテキストを表示します");
    console.error(await result_2.text());
    throw new Error(result_2.statusText);
  }

  const { tokenId } = (await result_2.json()) as {
    tokenId: string;
  };

  return tokenId;
};

export { getTokenId };
