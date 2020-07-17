import * as vscode from 'vscode';

export class CodelensProvider implements vscode.CodeLensProvider {

    private codeLenses: vscode.CodeLens[] = [];
    private regex: {regex: RegExp, message: string}[] = [];
    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

    constructor() {
        this.readRules();
        vscode.workspace.onDidChangeConfiguration((_) => {
            this.readRules();
            this._onDidChangeCodeLenses.fire();
        }); 
    }

    readRules() {
        const rules = vscode.workspace.getConfiguration("assistant").get("rules");
        const globalModifiers: string | undefined = vscode.workspace.getConfiguration("assistant").get("modifiers");
        if (rules) {
            this.regex = [];
            (rules as []).forEach((rule: {regex: string, message: string, modifiers: string}) => {

                // https://stackoverflow.com/a/31970023/38940
                // The index at which to start the next match. When "g" is absent, this will remain as 0.
                // Adding g to prevent infinite loop
                let modifier = rule.modifiers ? rule.modifiers : globalModifiers;
                modifier = modifier ? modifier : 'g';
                if (modifier && !modifier.includes('g')) {
                    modifier += 'g';
                }

                this.regex.push({
                    regex: new RegExp(
                        rule.regex, 
                        modifier
                    ),
                message: rule.message
                });
            });
        }
    }

    public provideCodeLenses(document: vscode.TextDocument, 
        token: vscode.CancellationToken): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {

        if (document.fileName.endsWith('code-workspace') || document.fileName === 'settings.json') { return []; }

        this.codeLenses = [];
        const text = document.getText();
        this.regex.forEach((regexSettings) => {
            const regex = regexSettings.regex;
            let matches;
            while ((matches = regex.exec(text)) !== null) {
                let position = document.positionAt(matches.index);
                // let range = document.getWordRangeAtPosition(position, new RegExp(regexSettings.regex, regexSettings.regex.flags));
                let range = new vscode.Range(position, position);
                if (range) {
                    const codeLens = new vscode.CodeLens(range);
                    codeLens.command = {
                        title: regexSettings.message,
                        command: "assistant.codelensAction"
                    };
                    this.codeLenses.push(codeLens);
                }
            }
        });
        return this.codeLenses;
    }

    public resolveCodeLens(codeLens: vscode.CodeLens, token: vscode.CancellationToken) {
        return codeLens;
    }
}