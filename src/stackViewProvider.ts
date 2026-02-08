import * as vscode from "vscode";

type StackNode = {
  id: string;
  title: string;
  status: "landable" | "approved" | "needs_changes" | "not_reviewed";
  blockedBy?: string;
};

type StackState = {
  stackName: string;
  base: string;
  currentNodeId: string;
  nodes: StackNode[];
};

export class StackViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = "graphiteControlPlane.stackView";

  private view?: vscode.WebviewView;

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };

    webviewView.webview.html = this.getHtml(webviewView.webview);

    // Handle messages from the webview (drag/drop reorder, refresh, etc.)
    webviewView.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.type) {
        case "ready":
          await this.postState();
          return;

        case "refresh":
          await this.postState();
          return;

        case "reorder": {
          // msg.payload: { fromId, toId }
          // Later: call Graphite CLI to restack.
          vscode.window.showInformationMessage(
            `Reorder requested: ${msg.payload?.fromId} -> ${msg.payload?.toId}`
          );

          // For now, just echo state again.
          await this.postState();
          return;
        }

        case "openUrl": {
          const url = msg.payload?.url;
          if (typeof url === "string") vscode.env.openExternal(vscode.Uri.parse(url));
          return;
        }
      }
    });
  }

  async refresh() {
    await this.postState();
  }

  private async postState() {
    if (!this.view) return;

    const state = await this.loadState();

    this.view.webview.postMessage({
      type: "state",
      payload: state,
    });
  }

  private async loadState(): Promise<StackState> {
    // TODO: Replace with real Graphite + GitHub data.
    // This is a fake stack to get the UI + message plumbing working.
    return {
      stackName: "feat/search-ui",
      base: "main",
      currentNodeId: "2",
      nodes: [
        { id: "1", title: "Search backend refactor", status: "approved" },
        {
          id: "2",
          title: "Add ranking weights",
          status: "needs_changes",
          blockedBy: "reviewer",
        },
        { id: "3", title: "UI polish", status: "not_reviewed" },
      ],
    };
  }

  private getHtml(webview: vscode.Webview) {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "stackView.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "stackView.css")
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
    <header class="header">
      <div class="title">Stack</div>
      <button id="refreshBtn" class="btn">Refresh</button>
    </header>

    <section class="meta">
      <div><span class="label">STACK</span> <span id="stackName">—</span></div>
      <div><span class="label">BASE</span> <span id="baseName">—</span></div>
    </section>

    <main>
      <ul id="stackList" class="stack"></ul>
    </main>

    <footer class="footer">
      <div id="editingLine" class="editing">You are editing: —</div>
    </footer>

    <script nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>`;
  }
}

function getNonce() {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
}
