import { getTokenId } from "../utils/getTokenId";
import { getShibboleth } from "../utils/getShibboleth";
import { getJSESSIONID } from "../utils/getJSESSIONID";
import { iliswave_url } from "../env";

// 図書館システムへのアクセスを行うクロージャ
const useOPAC = async ({
  user_id,
  password,
}: {
  user_id: string;
  password: string;
}) => {
  // まずログイントークンを取得する
  const { token_id } = await getTokenId({
    id: user_id,
    password: password,
  });

  // 次にShibbolethセッションを取得する
  // 同時に有効なJSESSIONIDを取得するための情報も取得する
  const {
    shibboleth_session,
    params: { mail, GakuNinEncryptedTime },
  } = await getShibboleth({
    token_id: token_id,
  });

  // 最後に図書館システムで利用できるJSESSIONIDを取得する
  const { opac_sessionid } = await getJSESSIONID({
    token_id: token_id,
    shibboleth_session: shibboleth_session,
    params: { mail: mail, GakuNinEncryptedTime: GakuNinEncryptedTime },
  });

  // コンテキストを定義
  const context = {
    token_id: token_id,
    shibboleth_session: shibboleth_session,
    opac_sessionid: opac_sessionid,
  };

  // 図書館システムにアクセスしてhtmlを取得する関数の定義
  const get_lental_list_html = async () => {
    const cookie = `JSESSIONID=${opac_sessionid}; iPlanetDirectoryPro=${token_id}; _shibsession_64656661756c7468747470733a2f2f6d796c69622e6d65696a6f2d752e61632e6a702f73686962626f6c6574682d7370=${shibboleth_session};`;

    const result = await fetch(`${iliswave_url}/webopac/lenlst.do`, {
      method: "GET",
      headers: {
        Cookie: cookie,
      },
    });

    // 正規表現を用いてテーブル部分だけのhtmlを抽出
    const table_pattern =
      /<table class="opac_data_list_ex">(.|\n|\r)*?<\/table>/gms;

    const table_html = (await result.text()).match(table_pattern);

    return table_html;
  };

  return { get_lental_list_html };
};

export { useOPAC };
