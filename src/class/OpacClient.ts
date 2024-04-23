import { Result, err, ok } from "neverthrow";
import { Book, BookWithDetails } from "../types/Book";
import { getTokenId } from "../utils/getTokenId";
import { getShibboleth } from "../utils/getShibboleth";
import { getJSESSIONID } from "../utils/getJSESSIONID";
import { retryFetch } from "../utils/retryFetch";
import { iliswave_url } from "../env";
import parse from "node-html-parser";

/**
 * 図書館システムのクライアントの型
 * @property token_id - ログイン時のトークン
 * @property shibboleth_session - Shibbolethセッション
 * @property opac_sessionid - 図書館システムのセッションID
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

  get_lental_list_with_details: (this: OpacClientType) => Promise<
    Result<
      BookWithDetails[],
      {
        status: number;
        statusText: string;
      }
    >
  >;
  _get_apache_token: () => Promise<
    Result<
      {
        token: string;
      },
      {
        status: number;
        statusText: string;
      }
    >
  >;
  extend_book: (
    this: OpacClientType,
    {
      book_id,
    }: {
      book_id: string;
    }
  ) => Promise<
    Result<
      Result<undefined, { errorText: string }>,
      {
        status: number;
        statusText: string;
      }
    >
  >;
};

/**
 * 図書館システムのクライアントを初期化する関数
 * @param user_id - ユーザーID
 * @param password - パスワード
 */
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
    console.error("[!] ログイントークンの取得に失敗しました");
    return err(result_token_id.error);
  }

  // 次にShibbolethセッションを取得する
  // 同時に有効なJSESSIONIDを取得するための情報も取得する
  const result_shibboleth = await getShibboleth({
    token_id: result_token_id.value.tokenId,
  });

  if (result_shibboleth.isErr()) {
    console.error("[!] shibbolethセッションの取得に失敗しました");
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
    console.error("[!] 図書館システムのセッション取得に失敗しました");
    return err(result_jsessionid.error);
  }

  const OpacClient: OpacClientType = {
    /**
     * ログイントークン
     */
    token_id: result_token_id.value.tokenId,
    /**
     * Shibbolethセッション
     */
    shibboleth_session: result_shibboleth.value.shibboleth_session,
    /**
     * 図書館システムのセッションID
     */
    opac_sessionid: result_jsessionid.value.opac_sessionid,

    /**
     * 貸出中の本の一覧を取得する関数
     * 延長のためのデータのみを取得する
     * @returns 貸出中の本の一覧
     * @example
     * const lental_list = await OpacClient.get_lental_list();
     * if (lental_list.isErr()) {
     * console.error(lental_list.error.statusText);
     * }
     */
    get_lental_list: async function (): Promise<
      Result<
        Book[],
        {
          status: number;
          statusText: string;
        }
      >
    > {
      const cookie = `JSESSIONID=${this.opac_sessionid}; iPlanetDirectoryPro=${this.token_id}; _shibsession_64656661756c7468747470733a2f2f6d796c69622e6d65696a6f2d752e61632e6a702f73686962626f6c6574682d7370=${this.shibboleth_session};`;

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
        console.error("[!] 図書館システムのデータの取得に失敗しました");
        return err({
          status: -1,
          statusText: "図書館システムのデータの取得に失敗しました",
        });
      }

      const table_html = (await result.value.text()).match(table_pattern);

      if (!table_html) {
        console.error("[!] テーブル部分のhtmlが取得できませんでした");
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
        console.error("[!] htmlの解析に失敗しました");
        return err({
          status: -1,
          statusText: "htmlの解析に失敗しました",
        });
      }

      // 一番上の行はヘッダなので除外し、各行に対して処理を行う
      const book_data_list: Book[] = [];

      // mapにこだわりすぎないことも大事
      for (const tr of table.querySelectorAll("tr").slice(1)) {
        // 一行のデータを取得する
        const book_data_raw = tr.querySelectorAll("td");

        // 書籍IDを取得
        const book_id = book_data_raw[1]
          .querySelector("input")
          ?.getAttribute("value");

        if (!book_id) {
          console.error("[!] 書籍IDの取得に失敗しました");
          return err({
            status: -1,
            statusText: "書籍IDの取得に失敗しました",
          });
        }

        const book_data = {
          // 書籍の詳細プロパティ
          detail: book_data_raw[7].text,
          // 書籍ID
          book_id,
          // ステータス
          status: book_data_raw[2].text as "" | "確認" | "延滞",
        };

        book_data_list.push(book_data);
      }

      return ok(book_data_list);
    },
    /**
     * 貸出中の本の一覧を取得する関数
     * 詳細も含めて取得する
     * @returns 貸出中の本の一覧
     * @example
     * const lental_list = await OpacClient.get_lental_list_with_details();
     * if (lental_list.isErr()) {
     *  console.error(lental_list.error.statusText);
     * }
     * console.log(lental_list.value);
     */
    get_lental_list_with_details: async function (): Promise<
      Result<
        BookWithDetails[],
        {
          status: number;
          statusText: string;
        }
      >
    > {
      const cookie = `JSESSIONID=${this.opac_sessionid}; iPlanetDirectoryPro=${this.token_id}; _shibsession_64656661756c7468747470733a2f2f6d796c69622e6d65696a6f2d752e61632e6a702f73686962626f6c6574682d7370=${this.shibboleth_session};`;

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
        console.error("[!] 図書館システムのデータの取得に失敗しました");
        return err({
          status: -1,
          statusText: "図書館システムのデータの取得に失敗しました",
        });
      }

      const table_html = (await result.value.text()).match(table_pattern);

      if (!table_html) {
        console.error("[!] テーブル部分のhtmlが取得できませんでした");
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
        console.error("[!] htmlの解析に失敗しました");
        return err({
          status: -1,
          statusText: "htmlの解析に失敗しました",
        });
      }

      // 一番上の行はヘッダなので除外し、各行に対して処理を行う
      const book_data_list: Omit<BookWithDetails, "image_url">[] = [];

      // mapにこだわりすぎないことも大事
      for (const tr of table.querySelectorAll("tr").slice(1)) {
        // 一行のデータを取得する
        const book_data_raw = tr.querySelectorAll("td");

        // 書籍IDを取得
        const book_id = book_data_raw[1]
          .querySelector("input")
          ?.getAttribute("value");

        if (!book_id) {
          console.error("[!] 書籍IDの取得に失敗しました");
          return err({
            status: -1,
            statusText: "書籍IDの取得に失敗しました",
          });
        }

        const book_data = {
          // 書籍の詳細プロパティ
          detail: book_data_raw[7].text,
          // 貸出したキャンパス
          campus: book_data_raw[3].text,
          // 貸出日
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

      // それぞれの書籍について画像URLを取得する
      const book_data_list_with_image: BookWithDetails[] = [];

      for (const book_data of book_data_list) {
        const headers = {
          Referer: "https://opac.meijo-u.ac.jp/index.php",
        };

        const data = new URLSearchParams({
          action: "v3search_action_main_opac",
          search_mode: "detail",
          op_param: `lenid=${book_data.book_id}`,
          block_id: "296",
        });

        const response = await fetch("https://opac.meijo-u.ac.jp/index.php", {
          method: "POST",
          headers: headers,
          body: data,
        });

        if (!response.ok) {
          console.error(
            `[!] 書籍詳細の取得に失敗しました。ステータスコード: ${response.status}`
          );
          return err({
            status: response.status,
            statusText: `書籍詳細の取得に失敗しました。ステータスコード: ${response.status}`,
          });
        }

        const responseText = await response.text();

        // Use regular expressions to extract the required information from the response
        const pattern = /opacImgdtlAjax\("([0-9a-z]+)"/;
        const match = pattern.exec(responseText);

        if (!match) {
          console.error("[!] ISBNが取得できませんでした");
          return err({
            status: -1,
            statusText: "書籍に対応するISBNが取得できませんでした。",
          });
        }

        const image_url = `https://mylib.meijo-u.ac.jp/webopac/imgview.do?isbn=${match[1]}`;
        book_data_list_with_image.push({
          ...book_data,
          image_url,
        });
      }

      return ok(book_data_list_with_image);
    },

    /**
     * apacheトークンを取得する関数
     * @returns apacheトークン
     * @example
     * const apache_token = await OpacClient._get_apache_token();
     * if (apache_token.isErr()) {
     *  console.error(apache_token.error.statusText);
     * }
     * console.log(apache_token.value);
     */
    _get_apache_token: async function (): Promise<
      Result<
        {
          token: string;
        },
        {
          status: number;
          statusText: string;
        }
      >
    > {
      const cookie = `JSESSIONID=${this.opac_sessionid}; iPlanetDirectoryPro=${this.token_id}; _shibsession_64656661756c7468747470733a2f2f6d796c69622e6d65696a6f2d752e61632e6a702f73686962626f6c6574682d7370=${this.shibboleth_session};`;

      const result = await retryFetch(`${iliswave_url}/webopac/lenlst.do`, {
        method: "GET",
        headers: {
          Cookie: cookie,
        },
      });

      if (result.isErr()) {
        console.error("[!] 図書館システムへのアクセスに失敗しました");
        return err({
          status: -1,
          statusText: "図書館システムへのアクセスに失敗しました",
        });
      }

      const apache_token_pattern =
        /name="org.apache.struts.taglib.html.TOKEN" value="([0-9a-f]*)"/i;

      const apache_token = (await result.value.text()).match(
        apache_token_pattern
      );

      if (!apache_token || apache_token[1] === undefined) {
        console.error("[!] apacheトークンが取得できませんでした");
        return err({
          status: -1,
          statusText: "apacheトークンが取得できませんでした",
        });
      }

      return ok({
        token: apache_token[1],
      });
    },

    /**
     * 書籍を延長する関数
     * @param book_id - 延長する書籍のID
     * @returns 延長結果
     * @example
     * const result = await OpacClient.extend_book({ book_id: "123456" });
     * if (result.isErr()) {
     *  console.error(result.error.statusText);
     * }
     * console.log("延長に成功しました");
     */
    extend_book: async function ({ book_id }) {
      const apache_token_result = await this._get_apache_token();

      if (apache_token_result.isErr()) {
        console.error("[!] トークンの取得に失敗しました");
        return err(apache_token_result.error);
      }

      const apache_token = apache_token_result.value.token;
      const cookie = `JSESSIONID=${this.opac_sessionid}; iPlanetDirectoryPro=${this.token_id}; _shibsession_64656661756c7468747470733a2f2f6d796c69622e6d65696a6f2d752e61632e6a702f73686962626f6c6574682d7370=${this.shibboleth_session};`;

      const result = await retryFetch(
        `${iliswave_url}/webopac/lenupd.do?org.apache.struts.taglib.html.TOKEN=${apache_token}&lenidlist=${book_id}&listcnt=20&sortkey=lmtdt/ASC&startpos=1`,
        {
          method: "POST",
          headers: {
            Cookie: cookie,
          },
        }
      );

      if (result.isErr()) {
        console.error("[!] 図書館システムへのアクセスに失敗しました");
        return err(result.error);
      }

      const result_text = await result.value.text();

      // 正規表現で延長結果を取得する
      const extend_result_pattern =
        /<p class="opac_description_area">\s*(.*?)\s*<\/p>/g;
      const extend_error_pattern = /<font color="red"><b>(.*?)<\/b><\/font>/;

      // 二番目の要素を取得するようにする
      const extend_result_itr = Array.from(
        result_text.matchAll(extend_result_pattern)
      );
      const extend_result = extend_result_itr[1];

      const extend_error = result_text.match(extend_error_pattern);

      if (!extend_result) {
        console.error("[!] 不明なエラーにより、延長に失敗しました");
        return err({
          status: -1,
          statusText: "不明なエラーにより、延長に失敗しました",
        });
      }

      // メッセージによって場合分け
      // メッセージに"以下の資料の貸出更新に失敗しました。"が含まれている場合はエラー
      if (extend_result[1].includes("以下の資料の貸出更新に失敗しました。")) {
        console.error(
          extend_error
            ? `[!] 延長に失敗しました。エラーメッセージ: ${extend_error[1]}`
            : "[!] 不明なエラーにより、延長に失敗しました"
        );

        return ok(
          err({ errorText: extend_error ? extend_error[1] : "不明なエラー" })
        );
      } else if (extend_result[1].includes("以下の資料を貸出更新しました。")) {
        console.log("[+] 延長に成功しました");
        return ok(ok(undefined));
      }

      console.error("[!] 不明な例外により、延長に失敗しました");
      return err({
        status: -1,
        statusText: "不明な例外により、延長に失敗しました",
      });
    },
  };

  return ok(OpacClient);
};

export { initOpacClient, OpacClientType };
