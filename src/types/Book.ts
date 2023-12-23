type Book = {
  book_id: string;
  detail: string;
  campus: string;
  lend_date: string;
  return_date: string;
  status: "" | "確認" | "延滞";
};

export type { Book };
