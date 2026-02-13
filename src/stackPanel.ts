import * as vscode from "vscode";
import {
  getStackState,
  gtSync,
  gtSubmitStack,
  gtRestack,
  gtCheckout,
  StackState,
} from "./gtCli";

export class StackPanel {
  static readonly viewType = "graphiteControlPlane.panel";

  private static currentPanel: StackPanel | undefined;

  static get current(): StackPanel | undefined {
    return StackPanel.currentPanel;
  }

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private readonly disposables: vscode.Disposable[] = [];
  private busy = false;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel;
    this.extensionUri = extensionUri;

    this.panel.webview.html = this.getHtml(this.panel.webview);

    this.panel.webview.onDidReceiveMessage(
      async (msg) => {
        switch (msg.type) {
          case "ready":
            await this.postState();
            return;

          case "refresh":
            await this.postState();
            return;

          case "checkout":
            await this.runAction("Checkout", () =>
              gtCheckout(msg.payload?.branch)
            );
            return;

          case "sync":
            await this.runAction("Sync", () => gtSync());
            return;

          case "submit":
            await this.runAction("Submit", () => gtSubmitStack());
            return;

          case "submitStack":
            await this.runAction("Submit Stack", () => gtSubmitStack());
            return;

          case "restack":
            await this.runAction("Restack", () => gtRestack());
            return;
        }
      },
      null,
      this.disposables
    );

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  static createOrShow(extensionUri: vscode.Uri) {
    if (StackPanel.currentPanel) {
      StackPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      StackPanel.viewType,
      "Graphite Control Plane",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri],
      }
    );

    StackPanel.currentPanel = new StackPanel(panel, extensionUri);
  }

  async refresh() {
    await this.postState();
  }

  async executeAction(type: string) {
    switch (type) {
      case "sync":
        await this.runAction("Sync", () => gtSync());
        break;
      case "submit":
        await this.runAction("Submit Stack", () => gtSubmitStack());
        break;
    }
  }

  private setLoading(loading: boolean) {
    this.panel.webview.postMessage({ type: "loading", payload: loading });
  }

  private async runAction(name: string, fn: () => Promise<string>) {
    if (this.busy) {
      vscode.window.showWarningMessage(
        `Graphite is busy, please wait for the current operation to finish.`
      );
      return;
    }

    this.busy = true;
    this.setLoading(true);

    try {
      await fn();
      vscode.window.showInformationMessage(`Graphite: ${name} complete.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      vscode.window.showErrorMessage(`Graphite ${name} failed: ${msg}`);
    } finally {
      this.busy = false;
      await this.postState();
    }
  }

  private async postState() {
    const state = await this.loadState();
    this.panel.webview.postMessage({
      type: "state",
      payload: state,
    });
  }

  private async loadState(): Promise<StackState> {
    return getStackState();
  }

  private getHtml(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "stackView.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, "media", "stackView.css")
    );

    const nonce = getNonce();

    return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy"
      content="default-src 'none';
               img-src ${webview.cspSource} https:;
               style-src ${webview.cspSource};
               script-src 'nonce-${nonce}';" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href="${styleUri}" rel="stylesheet" />
    <title>Graphite Control Plane</title>
  </head>
  <body>
    <div class="top-bar">
      <span class="button-group">
        <span class="top-bar-title">Graphite</span>
        <button id="syncBtn" class="btn btn-primary">Pull &amp; Sync</button>
        <button id="submitBtn" class="btn">Submit Stack</button>
        <button id="restackBtn" class="btn">Restack</button>
      </span>
      <span class="button-group-right">
        <button id="refreshBtn" class="btn-icon" title="Refresh">&#x21bb;</button>
      </span>
    </div>

    <div id="errorBanner" class="error-banner" style="display:none;">
      <span id="errorText"></span>
    </div>

    <div class="divider"></div>

    <section class="meta">
      <div><span class="meta-label">trunk</span> <span id="trunkName">\u2014</span></div>
      <div><span class="meta-label">head</span> <span id="currentName">\u2014</span></div>
    </section>

    <main class="main-content-area">
      <ul id="stackList" class="stack"></ul>
    </main>

    <div id="loadingOverlay" class="loading-overlay" style="display:none;">
      <div class="spinner"></div>
    </div>

    <script nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>`;
  }

  private dispose() {
    StackPanel.currentPanel = undefined;
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables.length = 0;
  }
}

function getNonce() {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
