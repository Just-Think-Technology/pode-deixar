// Auth errors — back-compat re-export of the centralized error layer
//
// New code imports from "@/lib/errors" directly; this module stays so
// existing auth forms keep working without churn.

export {
  getApiErrorMessage,
  getFriendlyMessage,
  toFriendlyError,
  shouldOfferRetry,
  logTechnicalError,
} from "@/lib/errors";
export {
  mapApiErrorToFieldErrors,
  isEmailNotVerifiedError,
} from "@/lib/errors/field-errors";
export {
  shouldNotifySessionExpired,
  resetSessionNoticeGuard,
} from "@/lib/errors/session";
