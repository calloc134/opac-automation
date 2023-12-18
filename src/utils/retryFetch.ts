// リトライ処理に対応したフェッチ関数

const retryFetch = async (
  url: string,
  options: RequestInit,
  retryCount = 3
): Promise<Response> => {
  try {
    const response = await fetch(url, options);
    if (response.ok) {
      return response;
    }
    throw new Error(response.statusText);
  } catch (error) {
    if (retryCount <= 0) {
      throw new Error(error);
    }
    return retryFetch(url, options, retryCount - 1);
  }
};

export { retryFetch };
