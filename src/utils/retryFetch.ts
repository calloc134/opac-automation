// リトライ処理に対応したフェッチ関数

const retryFetch = async (
  url: string,
  options: RequestInit,
  retryCount = 3
): Promise<Response> => {
  try {
    const response = await fetch(url, options);

    // redirect:manualの場合はとりあえず成功として判定
    // そうでない場合はresponse.okを使う
    if (!response.ok && options.redirect !== "manual") {
      console.log("[!] エラーが発生しました");
      console.log("[*] レスポンスのテキストを表示します");
      console.log(await response.text());
      throw new Error(response.statusText);
    }

    return response;
  } catch (error) {
    if (retryCount <= 0) {
      throw new Error(error);
    }
    // しばらく待ってからリトライする
    await new Promise((resolve) =>
      setTimeout(resolve, (1 / retryCount) * 1000)
    );
    return retryFetch(url, options, retryCount - 1);
  }
};

export { retryFetch };
