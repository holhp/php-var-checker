'use strict';

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';


const normalDecoration = vscode.window.createTextEditorDecorationType({
	textDecoration: 'none; opacity: 1',
	color: 'none',
});

const unusedDecorationType = vscode.window.createTextEditorDecorationType({
	textDecoration : "underline",
	color: 'rgba(250, 0, 0 , 0.5)',
	light: {
		borderColor: 'darkblue'
	},
	dark: {
		borderColor: 'lightblue'
	}
});

let normalizeRange : vscode.Range[] = [];

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('hello modafucker');
	
	vscode.window.onDidChangeActiveTextEditor(event => {
		console.log('onDidChangeActiveTextEditor');
		highlight();
	}, null, context.subscriptions);

	vscode.workspace.onDidSaveTextDocument(event => {
		console.log('onDidSaveTextDocument');
        highlight();
	}, null, context.subscriptions);

	let disposable = vscode.commands.registerCommand('extension.sayHelloPHP', () => {
        highlight();
	});
	
	context.subscriptions.push(disposable);

	highlight();

	/**
	 * Normarlize style for all variable
	 * Get unusing var
	 */
	function highlight() {
		const activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor || activeEditor.document.languageId !== 'php') {
			return;
		}
		normalizeRange = [];

		// Get all functions inside file
		const funcRegex = /function\s*([A-z0-9]+)?\s*\((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*\)\s*\{(?:[^}{]+|\{(?:[^}{]+|\{[^}{]*\})*\})*\}/gm;

		// Find all var ignore $this
		const varRegex = /(\$(?!this)[a-zA-Z0-9_\x7f-\xff]*)/gm;

		const accessModifierRegex = /(?:public|protected|private)\s\$([a-zA-Z0-9_\x7f-\xff]*)/gm;

		const text = activeEditor.document.getText();
		let matchFunc;
		let matchVar;
		let matchaccessModifiers;
		
		let unusingList = [];
		

		// Reset text cursor style
		const cursorPosition = new vscode.Position(activeEditor.selection.active.line, activeEditor.selection.active.character + 1);
		normalizeRange.push(new vscode.Range(activeEditor.selection.active, cursorPosition));

		while (matchaccessModifiers = accessModifierRegex.exec(text)) {
			const amMndex = matchaccessModifiers.index;
			const amStartPos = activeEditor.document.positionAt(amMndex);
			const amEndPos = activeEditor.document.positionAt(amMndex + matchaccessModifiers[0].length);
			normalizeRange.push(new vscode.Range(amStartPos, amEndPos));
			if (matchaccessModifiers) {
				let callerRegex : RegExp = new RegExp("\\$this->" + matchaccessModifiers[1], "gm");
				let amCount = text.match(callerRegex);
				if (amCount === null) {
					unusingList.push(new vscode.Range(amStartPos, amEndPos));
				}
			}
		}

		while (matchFunc = funcRegex.exec(text)) {
			if (matchFunc) {
				let declearedList : any = [];
			  	while (matchVar = varRegex.exec(matchFunc[0])) {
					if (matchVar) {
						const varName = matchVar[0];
						if (!declearedList[varName]) {
							declearedList[varName] = matchVar;
							declearedList[varName].count = 0;
						}
						let index = matchFunc.index + matchVar.index;
						declearedList[varName].count = declearedList[varName].count + 1;
						declearedList[varName].startPos = activeEditor.document.positionAt(index);
						declearedList[varName].endPos = activeEditor.document.positionAt(index + matchVar[0].length);
						normalizeRange.push(new vscode.Range(declearedList[varName].startPos, declearedList[varName].endPos));
					}
				}

				Object.keys(declearedList).forEach(function(varName) {
					if (declearedList[varName].count === 1) {
						unusingList.push(new vscode.Range(declearedList[varName].startPos, declearedList[varName].endPos));
					}
				});
			}
		}

		// Reset all style from all accessModifiers
		activeEditor.setDecorations(normalDecoration, normalizeRange);

		activeEditor.setDecorations(unusedDecorationType, unusingList);
	}}

// this method is called when your extension is deactivated
export function deactivate() {
	resetAllDecorations();
	console.log('deactivate');

	function resetAllDecorations() {
		vscode.window.visibleTextEditors.forEach(textEditor => {
			textEditor.setDecorations(normalDecoration, normalizeRange);
		});
	}
}