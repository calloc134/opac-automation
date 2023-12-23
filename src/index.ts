import { password, user_id } from "./env";
import { useOPAC } from "./hooks/useOPAC";
import { parse } from "node-html-parser";
import { Book } from "./types/Book";

// 図書館を延長するためのスクリプト
const main = async () => {
  // 図書館システムにログインする
  const { get_lental_list_html } = await useOPAC({
    user_id: user_id,
    password: password,
  });

  // htmlを取得する
  const table_html = await get_lental_list_html();

  console.log(table_html);

  if (!table_html) {
    throw new Error("テーブル部分のhtmlが取得できませんでした");
  }

  // 改行とタブの削除
  const table_html_str = table_html[0].replace(/\n|\r|\t/g, "");

  console.debug(table_html_str);

  const table = parse(table_html_str).querySelector("table.opac_data_list_ex");

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

  console.log(book_data_list);
};

main();
