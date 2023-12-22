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
};

main();
