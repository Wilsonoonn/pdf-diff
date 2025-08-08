export interface Difference {
  page_index: number;
  type: 'modification' | 'addition' | 'deletion';
  bbox_a: number[] | null;
  bbox_b: number[] | null;
  text_a: string | null;
  text_b: string | null;
  absolute_y_a: number | null;
  absolute_y_b: number | null;
}

export interface DocumentInfo {
  total_height: number;
}

export interface ComparisonResponse {
  document_info: {
    a: DocumentInfo;
    b: DocumentInfo;
  };
  differences: Difference[];
}