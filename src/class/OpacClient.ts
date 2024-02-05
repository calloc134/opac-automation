import { Result, err, ok } from "neverthrow";
import { Book } from "../types/Book";
import { getTokenId } from "../utils/getTokenId";
import { getShibboleth } from "../utils/getShibboleth";
import { getJSESSIONID } from "../utils/getJSESSIONID";
import { retryFetch } from "../utils/retryFetch";
import { iliswave_url } from "../env";
import parse from "node-html-parser";
/**
 * 図書館システムにアクセスするクライアント
 * 内部でOpenAM/Shibboleth/IlisWaveにアクセスする
 *
 * @user_id ユーザーID
 * @password パスワード
 */

type OpacClientType = {
  token_id: string;
  shibboleth_session: string;
  opac_sessionid: string;

  get_lental_list: (this: OpacClientType) => Promise<
    Result<
      Book[],
      {
        status: number;
        statusText: string;
      }
    >
  >;
  extend_book: (
    this: OpacClientType,
    book_id: string
  ) => Promise<
    Result<
      void,
      {
        status: number;
        statusText: string;
      }
    >
  >;
};

const initOpacClient = async ({
  user_id,
  password,
}: {
  user_id: string;
  password: string;
}) => {
  // まずログイントークンを取得する
  const result_token_id = await getTokenId({
    id: user_id,
    password: password,
  });

  if (result_token_id.isErr()) {
    console.error("[!] エラーが発生しました");
    console.error("[*] レスポンスのテキストを表示します");
    console.error(result_token_id.error.statusText);
    return err(result_token_id.error);
  }

  // 次にShibbolethセッションを取得する
  // 同時に有効なJSESSIONIDを取得するための情報も取得する
  const result_shibboleth = await getShibboleth({
    token_id: result_token_id.value.tokenId,
  });

  if (result_shibboleth.isErr()) {
    console.error("[!] エラーが発生しました");
    console.error("[*] レスポンスのテキストを表示します");
    console.error(result_shibboleth.error.statusText);
    return err(result_shibboleth.error);
  }

  // 最後に図書館システムで利用できるJSESSIONIDを取得する
  const result_jsessionid = await getJSESSIONID({
    token_id: result_token_id.value.tokenId,
    shibboleth_session: result_shibboleth.value.shibboleth_session,
    params: {
      mail: result_shibboleth.value.params.mail,
      GakuNinEncryptedTime: result_shibboleth.value.params.GakuNinEncryptedTime,
    },
  });

  if (result_jsessionid.isErr()) {
    console.error("[!] エラーが発生しました");
    console.error("[*] レスポンスのテキストを表示します");
    console.error(result_jsessionid.error.statusText);
    return err(result_jsessionid.error);
  }

  const OpacClient: OpacClientType = {
    token_id: result_token_id.value.tokenId,
    shibboleth_session: result_shibboleth.value.shibboleth_session,
    opac_sessionid: result_jsessionid.value.opac_sessionid,

    // 図書館システムにアクセスして本のリストを返却する関数の定義
    get_lental_list: async function () {
      const cookie = `JSESSIONID=${this.opac_sessionid}; iPlanetDirectoryPro=${this.token_id}; _shibsession_64656661756c7468747470733a2f2f6d796c69622e6d65696a6f2d752e61632e6a702f73686962626f6c6574682d7370=${shibboleth_session};`;

      const result = await retryFetch(`${iliswave_url}/webopac/lenlst.do`, {
        method: "GET",
        headers: {
          Cookie: cookie,
        },
      });

      // 正規表現を用いてテーブル部分だけのhtmlを抽出
      const table_pattern =
        /<table class="opac_data_list_ex">(.|\n|\r)*?<\/table>/gms;

      if (result.isErr()) {
        console.error("[!] エラーが発生しました");
        console.error("[*] レスポンスのテキストを表示します");
        console.error(result.error.statusText);
        return err({
          status: -1,
          statusText: "図書館システムへのアクセスに失敗しました",
        });
      }

      const table_html = (await result.value.text()).match(table_pattern);

      if (!table_html) {
        return err({
          status: -1,
          statusText: "テーブル部分のhtmlが取得できませんでした",
        });
      }

      // 改行とタブの削除
      const table_html_str = table_html[0].replace(/\n|\r|\t/g, "");

      const table = parse(table_html_str).querySelector(
        "table.opac_data_list_ex"
      );

      if (!table) {
        return err({
          status: -1,
          statusText: "htmlのパースに失敗しました",
        });
      }

      // 一番上の行はヘッダなので除外し、各行に対して処理を行う
      const book_data_list: Book[] = new Array<Book>();

      // mapにこだわりすぎないことも大事
      for (const tr of table.querySelectorAll("tr").slice(1)) {
        // 一行のデータを取得する
        const book_data_raw = tr.querySelectorAll("td");

        // 書籍IDを取得
        const book_id = book_data_raw[1]
          .querySelector("input")
          ?.getAttribute("value");

        if (!book_id) {
          return err({
            status: -1,
            statusText: "書籍IDの取得に失敗しました",
          });
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

        book_data_list.push(book_data);
      }

      return ok(book_data_list);
    },
  };

  return OpacClient;
};

export { initOpacClient, OpacClientType };
