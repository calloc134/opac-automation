import { openam_url } from "../env";

// ログイン時のトークン取得
const getTokenId = async ({
  id,
  password,
}: {
  id: string;
  password: string;
}) => {
  // まずログイン用の一時トークンの取得
  const result_1 = await fetch(`${openam_url}/json/authenticate`, {
    method: "POST",
  });

  if (!result_1.ok) {
    throw new Error(result_1.statusText);
  }

  const { authId } = (await result_1.json()) as {
    authId: string;
  };

  // 一時トークンを使って本トークンを取得
  const result_2 = await fetch(`${openam_url}/json/authenticate`, {
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
          echoPassword: false,
        },
      ],
    }),
  });

  if (!result_2.ok) {
    throw new Error(result_2.statusText);
  }

  const { tokenId } = (await result_2.json()) as {
    tokenId: string;
  };

  return tokenId;
};

export { getTokenId };
