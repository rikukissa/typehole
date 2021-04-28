import * as vscode from "vscode";

const logger = vscode.window.createOutputChannel("Typehole");

export const log = (...messages: string[]) =>
  logger.appendLine(["Info:"].concat(messages).join(" "));

export const warn = (...messages: string[]) =>
  logger.appendLine(["Warn:"].concat(messages).join(" "));

export const error = (...messages: string[]) =>
  logger.appendLine(["Error:"].concat(messages).join(" "));
