import { iliswave_url } from "../env";
import { retryFetch } from "./retryFetch";

// 図書館システムで使用するJSESSIONIDを取得する
const getJSESSIONID = async ({
  token_id,
  shibboleth_session,
  params: { mail, GakuNinEncryptedTime },
}: {
  token_id: string;
  shibboleth_session: string;
  params: { mail: string; GakuNinEncryptedTime: string };
}): Promise<{ JSESSIONID: string }> => {
  console.log("[*] 図書館システムで利用するJSESSIONIDを取得します...");

  const result = await retryFetch(`${iliswave_url}/webopac/gakursv.do`, {
    method: "POST",
    headers: {
      Cookie:
        "amlbcookie=02; iPlanetDirectoryPro=" +
        token_id +
        "; _shibsession_64656661756c7468747470733a2f2f6d796c69622e6d65696a6f2d752e61632e6a702f73686962626f6c6574682d7370=" +
        shibboleth_session,
    },
    body:
      "StatusCode=200&mail=" +
      mail +
      "&GakuNinEncryptedTime=" +
      GakuNinEncryptedTime,
  });

  if (!result.ok) {
    console.error("[!] エラーが発生しました");
    console.error("[*] レスポンスのテキストを表示します");
    console.error(await result.text());
    throw new Error(result.statusText);
  }

  // console.debug(result.headers);

  // クッキーを取得する
  const cookie = result.headers.get("set-cookie");

  if (!cookie) {
    throw new Error("クッキーが取得できませんでした");
  }

  // JSESSIONIDを取得する
  const JSESSIONID_pattern = /JSESSIONID=(.+?);/;
  const JSESSIONID = cookie.match(JSESSIONID_pattern);

  if (!JSESSIONID || JSESSIONID[1] === undefined) {
    throw new Error("JSESSIONIDが取得できませんでした");
  }

  console.log("[*] JSESSIONIDを取得しました");
  // console.debug(JSESSIONID[1]);

  return { JSESSIONID: JSESSIONID[1] };
};

export { getJSESSIONID };
