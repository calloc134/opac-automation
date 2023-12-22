import { password, user_id } from "./env";
import { getJSESSIONID } from "./utils/getJSESSIONID";
import { getShibboleth } from "./utils/getShibboleth";
import { getTokenId } from "./utils/getTokenId";

// 図書館を延長するためのスクリプト
const main = async () => {
  // まずログイントークンを取得する
  const { token_id } = await getTokenId({
    id: user_id,
    password: password,
  });

  // 次にShibbolethセッションを取得する
  const {
    shibboleth_session,
    params: { mail, GakuNinEncryptedTime },
  } = await getShibboleth({
    token_id: token_id,
  });

  // 最後に図書館システムで利用できるJSESSIONIDを取得する
  const { JSESSIONID } = await getJSESSIONID({
    token_id: token_id,
    shibboleth_session: shibboleth_session,
    params: { mail: mail, GakuNinEncryptedTime: GakuNinEncryptedTime },
  });

  console.debug(token_id);
  console.debug(shibboleth_session);
  console.debug(JSESSIONID);

  const cookie = `JSESSIONID=${JSESSIONID}; iPlanetDirectoryPro=${token_id}; _shibsession_64656661756c7468747470733a2f2f6d796c69622e6d65696a6f2d752e61632e6a702f73686962626f6c6574682d7370=${shibboleth_session};`;

  console.debug(cookie);

  const result = await fetch("https://mylib.meijo-u.ac.jp/webopac/asklst.do", {
    method: "GET",
    headers: {
      Cookie: cookie,
    },
  });

  console.log(await result.text());
};

main();
