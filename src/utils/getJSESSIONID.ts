import { err, ok } from "neverthrow";
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
}) => {
  console.log("[*] 図書館システムで利用するJSESSIONIDを取得します...");

  const result = await retryFetch(`${iliswave_url}/webopac/gakursv.do`, {
    method: "POST",
    headers: {
      Cookie:
        "iPlanetDirectoryPro=" +
        token_id +
        "; _shibsession_64656661756c7468747470733a2f2f6d796c69622e6d65696a6f2d752e61632e6a702f73686962626f6c6574682d7370=" +
        shibboleth_session +
        ";",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body:
      "StatusCode=200&mail=" +
      mail +
      "&GakuNinEncryptedTime=" +
      GakuNinEncryptedTime,
  });

  if (result.isErr()) {
    console.error("[!] エラーが発生しました");
    return result;
  }

  // クッキーを取得する
  const cookie = result.value.headers.get("set-cookie");

  if (!cookie) {
    console.error("[!] クッキーが取得できませんでした");
    return err({
      status: -1,
      statusText: "クッキーが取得できませんでした",
    });
  }

  // JSESSIONIDを取得する
  const JSESSIONID_pattern = /JSESSIONID=(.+?);/;
  const JSESSIONID = cookie.match(JSESSIONID_pattern);

  if (!JSESSIONID || JSESSIONID[1] === undefined) {
    console.error("[!] JSESSIONIDが取得できませんでした");
    return err({
      status: -1,
      statusText: "JSESSIONIDが取得できませんでした",
    });
  }

  console.log("[*] JSESSIONIDを取得しました");

  return ok({
    opac_sessionid: JSESSIONID[1],
  });
};

export { getJSESSIONID };
