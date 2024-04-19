export type Book = {
  status: "" | "確認" | "延滞";
  book_id: string;
  detail: string;
};

export type BookWithDetails = {
  book_id: string;
  detail: string;
  campus: string;
  lend_date: string;
  return_date: string;
  status: "" | "確認" | "延滞";
  image_url: string;
};
