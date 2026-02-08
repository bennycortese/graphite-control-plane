import * as vscode from "vscode";
import { StackPanel } from "./stackPanel";

export function activate(context: vscode.ExtensionContext) {
  // Register the command to open the panel in the editor area
  context.subscriptions.push(
    vscode.commands.registerCommand("graphiteControlPlane.openPanel", () => {
      StackPanel.createOrShow(context.extensionUri);
    })
  );

  // Register refresh command
  context.subscriptions.push(
    vscode.commands.registerCommand("graphiteControlPlane.refresh", () => {
      StackPanel.current?.refresh();
    })
  );

  // Register a webview view provider that auto-opens the editor panel
  // when the user clicks the Graphite icon in the activity bar
  const launcherProvider: vscode.WebviewViewProvider = {
    resolveWebviewView(webviewView: vscode.WebviewView) {
      webviewView.webview.html = "<html><body></body></html>";

      const openAndCloseSidebar = () => {
        StackPanel.createOrShow(context.extensionUri);
        vscode.commands.executeCommand("workbench.action.closeSidebar");
      };

      // Open panel immediately on first activation
      setTimeout(openAndCloseSidebar, 50);

      // Also open panel whenever the sidebar view becomes visible again
      webviewView.onDidChangeVisibility(() => {
        if (webviewView.visible) {
          openAndCloseSidebar();
        }
      });
    },
  };

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "graphiteControlPlane.launcher",
      launcherProvider
    )
  );
}

export function deactivate() {}
