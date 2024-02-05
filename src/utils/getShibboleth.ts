import { iliswave_url } from "../env";
import { retryFetch } from "./retryFetch";
import { decodeHTMLEntities } from "./decodeHTMLEntities";
import { err, ok } from "neverthrow";

// Shibbolethセッションを取得する関数の定義
const getShibboleth = async ({ token_id }: { token_id: string }) => {
  console.log("[*] SAMLレスポンスを取得します...");
  const result_1 = await retryFetch(`${iliswave_url}/eduapi/gknsso/iLiswave`, {
    method: "GET",
    headers: {
      Cookie: "iPlanetDirectoryPro=" + token_id,
    },
  });

  if (result_1.isErr()) {
    console.error("[!] エラーが発生しました");
    console.error("[*] レスポンスのテキストを表示します");
    console.error(await result_1.error.statusText);
    return result_1;
  }

  // XMLエンティティのデコードを行う
  const decoded_text = decodeHTMLEntities(await result_1.value.text());
  console.log("[*] SAMLレスポンスのXMLをデコードしました");

  // 正規表現でSAMLResponseとRelayStateを取得する
  const saml_response_pattern =
    /<input[^>]*name="SAMLResponse"[^>]*value="([^"]*)"/;
  const relay_state_pattern =
    /<input[^>]*name="RelayState"[^>]*value="([^"]*)"/;

  const saml_response = decoded_text.match(saml_response_pattern);
  const relay_state = decoded_text.match(relay_state_pattern);

  if (!saml_response || !relay_state) {
    throw new Error("SAMLResponseまたはRelayStateが取得できませんでした");
  }

  console.log("[*] SAMLResponseとRelayStateを取得しました");
  console.log("[*] Shibbolethセッションを取得します...");

  const result_2 = await retryFetch(
    `${iliswave_url}/Shibboleth.sso/SAML2/POST`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: "iPlanetDirectoryPro=" + token_id,
      },
      // urlをエンコードする
      // URLSearchParamsを使う
      body: new URLSearchParams({
        SAMLResponse: saml_response[1],
        RelayState: relay_state[1],
      }),
      redirect: "manual",
    }
  );

  if (result_2.isErr()) {
    console.error("[!] エラーが発生しました");
    console.error("[*] レスポンスのテキストを表示します");
    console.error(await result_2.error.statusText);
    return result_2;
  }

  const cookie = result_2.value.headers.get("set-cookie");

  // クッキーから
  // _shibsession_64656661756c7468747470733a2f2f6d796c69622e6d65696a6f2d752e61632e6a702f73686962626f6c6574682d7370
  // にマッチするクッキーを取得する
  const shibsession_pattern =
    /_shibsession_64656661756c7468747470733a2f2f6d796c69622e6d65696a6f2d752e61632e6a702f73686962626f6c6574682d7370=(.+?);/;
  const shibsession = cookie?.match(shibsession_pattern);

  if (!shibsession || shibsession[1] === undefined) {
    return err({
      status: -1,
      statusText: "Shibbolethセッションが取得できませんでした",
    });
  }

  console.log("[*] Shibbolethセッションを取得しました");

  console.log("[*] 必要なパラメータ群を取得します...");
  const result_3 = await retryFetch(`${iliswave_url}/eduapi/gknsso/iLiswave`, {
    method: "GET",
    headers: {
      Cookie:
        "iPlanetDirectoryPro=" +
        token_id +
        "; _shibsession_64656661756c7468747470733a2f2f6d796c69622e6d65696a6f2d752e61632e6a702f73686962626f6c6574682d7370=" +
        shibsession[1],
    },
  });

  if (result_3.isErr()) {
    console.error("[!] エラーが発生しました");
    console.error("[*] レスポンスのテキストを表示します");
    console.error(await result_3.error.statusText);
    return result_3;
  }

  const ilis_text = await result_3.value.text();

  // パラメータの解析
  const mail_pattern = /<input type="hidden" name="mail" value="([^"]+)"/;
  const GakuNinEncryptedTime_pattern =
    /<input type="hidden" name="GakuNinEncryptedTime" value="([^"]+)"/;

  const mail = ilis_text.match(mail_pattern);
  const GakuNinEncryptedTime = ilis_text.match(GakuNinEncryptedTime_pattern);

  if (!mail || !GakuNinEncryptedTime) {
    return err({
      status: -1,
      statusText: "mailまたはGakuNinEncryptedTimeが取得できませんでした",
    });
  }

  console.log("[*] 必要なパラメータ群を取得しました");

  return ok({
    shibboleth_session: shibsession[1],
    params: {
      mail: mail[1],
      GakuNinEncryptedTime: GakuNinEncryptedTime[1],
    },
  });
};

export { getShibboleth };
