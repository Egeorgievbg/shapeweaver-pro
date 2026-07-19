export class BoxcraftError extends Error {
  status?: number;
  code: string;
  requestId?: string;
  details?: unknown;
  constructor(
    code: string,
    message: string,
    opts?: { status?: number; requestId?: string; details?: unknown },
  ) {
    super(message);
    this.name = "BoxcraftError";
    this.code = code;
    this.status = opts?.status;
    this.requestId = opts?.requestId;
    this.details = opts?.details;
  }
}

export class NetworkError extends BoxcraftError {
  constructor(message: string, details?: unknown) {
    super("network_error", message, { details });
    this.name = "NetworkError";
  }
}

export class ApiUnavailableError extends BoxcraftError {
  constructor(
    message = "The packaging data service is currently unavailable. Check the API connection or try again.",
    details?: unknown,
  ) {
    super("api_unavailable", message, { details });
    this.name = "ApiUnavailableError";
  }
}

export class ProductNotFoundError extends BoxcraftError {
  constructor(productId: string) {
    super("product_not_found", `Product "${productId}" was not found.`, { status: 404 });
    this.name = "ProductNotFoundError";
  }
}

export class PayloadIncompleteError extends BoxcraftError {
  constructor(missing: string[]) {
    super("payload_incomplete", `Payload package is missing: ${missing.join(", ")}`, {
      details: { missing },
    });
    this.name = "PayloadIncompleteError";
  }
}
