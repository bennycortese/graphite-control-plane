import * as vscode from "vscode";
import {
  getStackState,
  gtSync,
  gtSubmitStack,
  gtRestack,
  gtCheckout,
  gtCreate,
  gtMoveBranch,
  getCommitsForBranch,
  rebaseCommits,
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

          case "getCommits":
            // Read-only, no busy gate
            try {
              const commits = await getCommitsForBranch(
                msg.payload?.branch,
                msg.payload?.parent
              );
              this.panel.webview.postMessage({
                type: "commits",
                payload: { branch: msg.payload?.branch, commits },
              });
            } catch {
              this.panel.webview.postMessage({
                type: "commits",
                payload: { branch: msg.payload?.branch, commits: [] },
              });
            }
            return;

          case "createBranch": {
            const name = await vscode.window.showInputBox({
              prompt: "Enter a name for the new stacked branch",
              placeHolder: "my-feature",
              validateInput: (value) => {
                if (!value || !value.trim()) {
                  return "Branch name is required";
                }
                if (/\s/.test(value)) {
                  return "Branch name cannot contain spaces";
                }
                return undefined;
              },
            });
            if (name) {
              await this.runAction("Create Branch", () => gtCreate(name));
            }
            return;
          }

          case "reorderBranches":
            await this.runAction("Reorder Branches", async () => {
              const order = msg.payload?.order as string[];
              if (!order) {
                throw new Error("No order provided");
              }
              for (let i = 1; i < order.length; i++) {
                await gtMoveBranch(order[i], order[i - 1]);
              }
              return gtRestack();
            });
            return;

          case "reorderCommits":
            await this.runAction("Reorder Commits", async () => {
              return rebaseCommits(
                msg.payload?.branch,
                msg.payload?.parent,
                msg.payload?.commitActions
              );
            });
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
               style-src ${webview.cspSource} 'unsafe-inline';
               script-src 'nonce-${nonce}';" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href="${styleUri}" rel="stylesheet" />
    <title>Graphite Control Plane</title>
  </head>
  <body>
    <div id="root"></div>
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
