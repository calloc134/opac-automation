import { getTokenId } from "../utils/getTokenId";
import { getShibboleth } from "../utils/getShibboleth";
import { getJSESSIONID } from "../utils/getJSESSIONID";
import { iliswave_url } from "../env";
import { parse } from "node-html-parser";
import { Book } from "../types/Book";

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

  // 図書館システムにアクセスして本のリストを返却する関数の定義
  const get_lental_list = async () => {
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

    if (!table_html) {
      throw new Error("テーブル部分のhtmlが取得できませんでした");
    }

    // 改行とタブの削除
    const table_html_str = table_html[0].replace(/\n|\r|\t/g, "");

    // console.debug(table_html_str);

    const table = parse(table_html_str).querySelector(
      "table.opac_data_list_ex"
    );

    if (!table) {
      throw new Error("htmlのパースに失敗しました");
    }

    // 一番上の行はヘッダなので除外し、各行に対して処理を行う
    const book_data_list: Book[] = table
      .querySelectorAll("tr")
      .slice(1)
      .map((tr) => {
        // 一行のデータを取得する
        const book_data_raw = tr.querySelectorAll("td");

        // 書籍IDを取得
        const book_id = book_data_raw[1]
          .querySelector("input")
          ?.getAttribute("value");

        if (!book_id) {
          throw new Error("書籍IDの取得に失敗しました");
        }

        const book_data = {
          // 書籍の詳細プロパティ
          detail: book_data_raw[7].text,
          // 貸し出ししたキャンパス
          campus: book_data_raw[3].text,
          // 貸し出し日
          lend_date: book_data_raw[5].text,
          // 返却期限
          return_date: book_data_raw[4].text,
          // 書籍ID
          book_id,
          // ステータス
          status: book_data_raw[2].text as "" | "確認" | "延滞",
        };

        return book_data;
      });

    return book_data_list;
  };

  return { get_lental_list };
};

export { useOPAC };
