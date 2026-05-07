export const reportOperatorError = (message: string, error: unknown): void => {
  globalThis.console.error(message, error);
};
