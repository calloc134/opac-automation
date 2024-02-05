import { ok, err, Result } from "neverthrow";
// リトライ処理に対応したフェッチ関数

const retryFetch = async (
  url: string,
  options: RequestInit,
  retryCount = 3
): Promise<Result<Response, { status: number; statusText: string }>> => {
  try {
    const response = await fetch(url, options);

    // redirect:manualの場合はとりあえず成功として判定
    // そうでない場合はresponse.okを使う
    if (!response.ok && options.redirect !== "manual") {
      console.error("[!] エラーが発生しました");
      console.error("[*] レスポンスのテキストを表示します");
      console.error(await response.text());
      return err({
        status: response.status,
        statusText: response.statusText,
      });
    }

    return ok(response);
  } catch (error) {
    if (retryCount <= 0) {
      console.log("[!] リトライ回数を超えました");
      return err({ status: -1, statusText: "リトライ回数を超えました" });
    }

    console.log("[!] エラーが発生しました");
    console.log("[*] リトライします");
    // しばらく待ってからリトライする
    await new Promise((resolve) =>
      setTimeout(resolve, (1 / retryCount) * 3000)
    );
    return retryFetch(url, options, retryCount - 1);
  }
};

export { retryFetch };
