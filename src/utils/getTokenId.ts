import { openam_url } from "../env";
import { ok, err, Result } from "neverthrow";

// ログイン時のトークン取得
const getTokenId = async ({
  id,
  password,
}: {
  id: string;
  password: string;
}): Promise<
  Result<{ tokenId: string }, { status: number; statusText: string }>
> => {
  // 成功するまでリトライする
  // このとき、回数によってリトライの間隔を変える
  for (let i = 0; i < 3; i++) {
    console.log("[*] 一時トークンを取得します...");
    // まずログイン用の一時トークンの取得
    const result_1 = await fetch(`${openam_url}/json/authenticate`, {
      method: "POST",
    });

    if (!result_1.ok) {
      console.error("[!] ログイン時の一時トークンの取得に失敗しました");
      console.log("[*] リトライします");
      // しばらく待ってからリトライする
      await new Promise((resolve) => setTimeout(resolve, (1 / (i + 1)) * 3000));
      continue;
    }

    const { authId } = (await result_1.json()) as {
      authId: string;
    };

    console.log("[*] 一時トークンを取得しました");
    console.log("[*] 本トークンを取得します...");

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
          },
        ],
      }),
    });

    if (!result_2.ok) {
      console.error(
        "[!] 本トークンの取得に失敗しました。ログイン試行に失敗した可能性があります"
      );

      console.log("[*] リトライします");
      // しばらく待ってからリトライする
      await new Promise((resolve) => setTimeout(resolve, (1 / (i + 1)) * 3000));
      continue;
    }

    const { tokenId } = (await result_2.json()) as {
      tokenId: string;
    };
    console.log("[*] 本トークンを取得しました");

    return ok({
      tokenId,
    });
  }

  return err({ status: -1, statusText: "トークンの取得に失敗しました" });
};

export { getTokenId };
