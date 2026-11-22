export type FreeTierType = "recurring" | "trial" | "keyless" | "local" | "paid" | "unknown";

export type HealthStatus = "healthy" | "degraded" | "rate_limited" | "unavailable" | "unknown";

export type QuotaSource = "verified" | "estimated" | "unknown";

export interface ProviderEligibility {
  provider: string;
  provider_source: "groq_direct" | "openrouter" | "gemini_fallback";
  upstream_provider?: string;
  model: string;
  display_name?: string;
  is_free: boolean;
  free_tier_type: FreeTierType;
  supports_vision: boolean;
  supports_document_images: boolean;
  supports_structured_output: boolean;
  supports_arabic?: boolean;
  context_window: number | null;
  requests_per_minute: number | null;
  requests_per_day: number | null;
  tokens_per_minute: number | null;
  tokens_per_day: number | null;
  remaining_daily_requests: number | null;
  remaining_daily_quota: number | null;
  remaining_minute_requests: number | null;
  remaining_minute_tokens: number | null;
  quota_reset_at: string | null;
  quota_source: QuotaSource;
  shared_quota_pool: string;
  payment_required: boolean;
  terms_approved: boolean;
  terms_notes?: string;
  health_status: HealthStatus;
  avg_latency_ms: number | null;
  last_verified_at: string | null;
  eligible_for_routing: boolean;
  excluded_reason: string | null;
}

export type TaskCategory =
  | "document_classification"
  | "ocr_text_recognition"
  | "visual_layout_understanding"
  | "key_value_extraction"
  | "table_extraction"
  | "handwriting_recognition"
  | "stamp_signature_identification"
  | "arabic_english_understanding"
  | "form_detection"
  | "field_normalisation"
  | "extraction_verification"
  | "document_qa";

export type SupportedDocumentFormat =
  | "pdf"
  | "png"
  | "jpg"
  | "jpeg"
  | "webp"
  | "tiff"
  | "docx"
  | "pptx"
  | "xlsx";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type CoordinateSource =
  | "model_proposed"
  | "source_matched"
  | "visually_verified"
  | "none";

export type VerificationStatus = "VERIFIED" | "NEEDS_REVIEW" | "NOT_FOUND";

export interface ExtractedField {
  field_id: string;
  label: string;
  normalized_key: string;
  value: string | number | boolean | null;
  raw_value: string | null;
  data_type: "string" | "number" | "date" | "currency" | "boolean" | "array" | "unknown";
  page_number: number;
  source_text: string | null;
  structural_ref?: string | null;
  bounding_box: BoundingBox | null;
  coordinate_source: CoordinateSource;
  confidence: number | null;
  verification_status: VerificationStatus;
  verification_notes?: string;
}

export interface ExtractedTableCell {
  row: number;
  col: number;
  value: string;
  is_header?: boolean;
}

export interface ExtractedTable {
  table_id: string;
  title: string | null;
  page_number: number;
  headers: string[];
  rows: string[][];
  bounding_box: BoundingBox | null;
  coordinate_source: CoordinateSource;
  verification_status: VerificationStatus;
}

export interface DocumentClassification {
  document_type: string;
  subtype: string | null;
  language: string;
  is_rtl: boolean;
  page_count: number;
  is_form: boolean;
  has_tables: boolean;
  has_signatures: boolean;
  has_stamps: boolean;
  has_handwriting: boolean;
  confidence: number | null;
  summary: string;
  provider_used?: string;
  model_used?: string;
}

export interface OcrBlock {
  text: string;
  bbox: BoundingBox;
  confidence?: number;
}

export interface DocumentPage {
  page_number: number;
  width: number;
  height: number;
  image_url?: string;
  image_path?: string;
  mime_type?: string;
  text_content?: string;
  ocr_blocks?: OcrBlock[];
  structural_blocks?: Array<{
    ref: string;
    type: "paragraph" | "heading" | "table" | "slide" | "sheet" | "cell";
    text: string;
  }>;
}

export interface DigitalFormField {
  id: string;
  label: string;
  normalized_key: string;
  field_type: "text" | "number" | "date" | "checkbox" | "textarea" | "signature";
  value: string | boolean | null;
  is_empty: boolean;
  checked?: boolean;
  page_number: number;
  order: number;
  section?: string;
  source_field_id?: string;
}

export interface DigitalFormSection {
  title: string;
  order: number;
  fields: DigitalFormField[];
}

export interface DigitalFormSchema {
  form_id: string;
  document_id: string;
  title: string;
  language: string;
  is_rtl: boolean;
  generated_at: string;
  sections: DigitalFormSection[];
  tables: ExtractedTable[];
  provider_used?: string;
  model_used?: string;
}

export interface QACitation {
  page_number: number;
  supporting_passage: string;
  field_id?: string;
  table_id?: string;
  bounding_box?: BoundingBox | null;
}

export interface QAMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  citations?: QACitation[];
  uncertainty_note?: string | null;
  not_found_in_document?: boolean;
  provider_used?: string;
  model_used?: string;
}

export interface ProcessingStepLog {
  step: string;
  task: TaskCategory;
  status: "completed" | "failed" | "skipped";
  provider?: string;
  model?: string;
  duration_ms: number;
  input_tokens?: number | null;
  output_tokens?: number | null;
  error?: string;
  timestamp: string;
}

export interface DocumentRecord {
  id: string;
  filename: string;
  original_mime: string;
  format: SupportedDocumentFormat;
  size_bytes: number;
  page_count: number;
  blob_url?: string;
  local_file_path?: string;
  created_at: string;
  updated_at: string;
  status: "uploaded" | "processing" | "completed" | "failed";
  error_message?: string;
  pages: DocumentPage[];
  classification?: DocumentClassification;
  fields: ExtractedField[];
  tables: ExtractedTable[];
  digital_form?: DigitalFormSchema;
  qa_history: QAMessage[];
  processing_logs: ProcessingStepLog[];
  total_processing_ms?: number;
}

export interface ProcessingJob {
  job_id: string;
  document_id: string;
  status: "queued" | "running" | "completed" | "failed";
  stage: string;
  progress_pct: number;
  created_at: string;
  updated_at: string;
  error?: string;
}

export interface UsageEvent {
  id: string;
  timestamp: string;
  provider: string;
  model: string;
  shared_quota_pool: string;
  task: TaskCategory;
  document_id?: string;
  pages_count: number;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  success: boolean;
  rate_limited: boolean;
  error_message?: string;
}

export interface DailyUsageLedgerState {
  date: string; // YYYY-MM-DD
  requests_today: number;
  documents_processed_today: number;
  pages_processed_today: number;
  input_tokens_today: number;
  output_tokens_today: number;
  rate_limit_events_today: number;
  provider_failures_today: number;
  successful_extractions_today: number;
  total_latency_ms_today: number;
  avg_processing_time_ms: number;
  events: UsageEvent[];
}

export interface CapacityEstimate {
  daily_document_target: number;
  default_workload_pages: number;
  max_document_pages: number;
  estimated_tokens_per_page: number;
  estimated_calls_per_document: number;
  verified_remaining_documents: number | null;
  estimated_remaining_documents: number | null;
  shortfall_documents: number | null;
  capacity_status: "sufficient" | "tight" | "insufficient" | "unknown";
  notes: string[];
}
