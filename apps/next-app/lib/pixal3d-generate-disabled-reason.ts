interface Pixal3DGenerateDisabledReasonInput {
  isSessionPending: boolean;
  isAuthenticated: boolean;
  hasImage: boolean;
  creditBalance: number;
  requiredCredits: number;
  isReadingFile: boolean;
  isProcessing: boolean;
  labels: {
    signInRequired: string;
    insufficientCredits: string;
    imageRequired: string;
    readingImage: string;
  };
}

function formatCredits(value: number) {
  return value.toLocaleString("en-US");
}

export function getPixal3DGenerateDisabledReason(input: Pixal3DGenerateDisabledReasonInput) {
  if (input.isSessionPending || input.isProcessing) return null;

  if (!input.isAuthenticated) {
    return input.labels.signInRequired;
  }

  if (input.creditBalance < input.requiredCredits) {
    return input.labels.insufficientCredits
      .replace("{required}", formatCredits(input.requiredCredits))
      .replace("{balance}", formatCredits(input.creditBalance));
  }

  if (input.isReadingFile) {
    return input.labels.readingImage;
  }

  if (!input.hasImage) {
    return input.labels.imageRequired;
  }

  return null;
}
