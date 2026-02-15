import type { WebviewApi } from "vscode-webview";
import type { WebviewMessage } from "./types";

class VSCodeAPIWrapper {
  private readonly vsCodeApi: WebviewApi<unknown>;

  constructor() {
    this.vsCodeApi = acquireVsCodeApi();
  }

  public postMessage(message: WebviewMessage): void {
    this.vsCodeApi.postMessage(message);
  }
}

export const vscodeApi = new VSCodeAPIWrapper();
