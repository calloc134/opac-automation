import { iliswave_url } from "../env";
import { retryFetch } from "./retryFetch";
import { decodeHTMLEntities } from "./decodeHTMLEntities";

// Shibbolethセッションを取得する関数の定義
const getShibboleth = async ({ token_id }: { token_id: string }) => {
  console.log("[*] SAMLレスポンスを取得します...");
  const result_1 = await retryFetch(`${iliswave_url}/eduapi/gknsso/iLiswave`, {
    method: "GET",
    headers: {
      Cookie: "amlbcookie=01; iPlanetDirectoryPro=" + token_id,
    },
  });

  if (!result_1.ok) {
    console.error("[!] エラーが発生しました");
    console.error("[*] レスポンスのテキストを表示します");
    console.error(await result_1.text());
    throw new Error(result_1.statusText);
  }

  console.log("[*] SAMLレスポンスを取得しました");
  // XMLエンティティのデコードを行う
  const decoded_text = decodeHTMLEntities(await result_1.text());
  console.log("[*] XMLエンティティをデコードしました");

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
        Cookie: "amlbcookie=01; iPlanetDirectoryPro=" + token_id,
      },
      // urlをエンコードする
      // 改行も含まれるので、encodeURIComponentを使う
      body: new URLSearchParams({
        SAMLResponse: saml_response[1],
        RelayState: relay_state[1],
      }),
      redirect: "manual",
    }
  );

  const cookie = result_2.headers.get("set-cookie");

  // console.debug(cookie);

  // クッキーから
  // _shibsession_64656661756c7468747470733a2f2f6d796c69622e6d65696a6f2d752e61632e6a702f73686962626f6c6574682d7370
  // にマッチするクッキーを取得する
  const shibsession_pattern =
    /_shibsession_64656661756c7468747470733a2f2f6d796c69622e6d65696a6f2d752e61632e6a702f73686962626f6c6574682d7370=(.+?);/;
  const shibsession = cookie?.match(shibsession_pattern);

  if (!shibsession || shibsession[1] === undefined) {
    throw new Error("[!] Shibbolethセッションが取得できませんでした");
  }

  console.log("[*] Shibbolethセッションを取得しました");
  // console.debug(shibsession[1]);

  console.log("[*] 必要なパラメータ群を取得します...");
  const result_3 = await retryFetch(`${iliswave_url}/eduapi/gknsso/iLiswave`, {
    method: "GET",
    headers: {
      Cookie:
        "amlbcookie=01; iPlanetDirectoryPro=" +
        token_id +
        "; _shibsession_64656661756c7468747470733a2f2f6d796c69622e6d65696a6f2d752e61632e6a702f73686962626f6c6574682d7370=" +
        shibsession[1],
    },
  });

  const ilis_text = await result_3.text();
  // console.debug(ilis_text);

  // パラメータの解析
  const mail_pattern = /<input type="hidden" name="mail" value="([^"]+)"/;
  const GakuNinEncryptedTime_pattern =
    /<input type="hidden" name="GakuNinEncryptedTime" value="([^"]+)"/;

  const mail = ilis_text.match(mail_pattern);
  const GakuNinEncryptedTime = ilis_text.match(GakuNinEncryptedTime_pattern);

  if (!mail || !GakuNinEncryptedTime) {
    throw new Error("mailまたはGakuNinEncryptedTimeが取得できませんでした");
  }

  console.log("[*] 必要なパラメータ群を取得しました");
  // console.debug(mail[1]);
  // console.debug(GakuNinEncryptedTime[1]);

  return {
    shibboleth_session: shibsession[1],
    params: {
      mail: mail[1],
      GakuNinEncryptedTime: GakuNinEncryptedTime[1],
    },
  };
};

export { getShibboleth };
