import { tsquery } from "@phenomnomnominal/tsquery";
import f from "fastify";

import * as ts from "typescript";
import * as vscode from "vscode";

import { getEditorRange, getProjectRoot } from "./editor/utils";
import { error, log } from "./logger";
import { findTypeholes, getAST, resolveImportPath } from "./parse/module";
import { addSample, addWarning, getHole, Typehole } from "./state";
import {
  findDeclarationWithName,
  getAllDependencyTypeDeclarations,
  getTypeAliasForId,
  getTypeReferenceNameForId,
} from "./transforms/insertTypes";
import { samplesToType } from "./transforms/samplesToType";

let running = false;
export function isServerRunning() {
  return running;
}
let server = createServer();

function createServer() {
  const fastify = f({ logger: true });
  fastify.register(require("fastify-cors"));

  fastify.post("/type", async (request, reply) => {
    vscode.window.showWarningMessage(
      "Typehole: You seem to be running an old version of the runtime. Remove 'typehole' package from node_modules and add a new typehole to download the latest version or install it manually."
    );
    return reply.code(200).send();
  });

  fastify.post("/samples", async (request, reply) => {
    const body = request.body as any;
    log(
      body.id,
      "-",
      "New sample",
      JSON.stringify(request.body).substr(0, 30),
      "received"
    );

    const samples = addSample(body.id, body.sample);
    const typeString = samplesToType(samples);

    try {
      await onTypeExtracted(body.id, typeString);
    } catch (err) {
      error(err.message);
    }

    return reply.code(200).send();
  });

  fastify.post("/unserializable", async (request, reply) => {
    const body = request.body as any;
    error("Value in typehole", body.id, "is unserializable");
    onUnserializable(body.id);
    return reply.code(200).send();
  });
  return fastify;
}

export async function startListenerServer(port: number) {
  log("Requesting HTTP server start");

  running = true;
  try {
    await server.listen(port);
    log("HTTP server started");
  } catch (err) {
    error("Starting HTTP server failed");
    running = false;
    console.error(err);
    throw err;
  }
}

export async function stopListenerServer() {
  log("Stopping the HTTP server");
  try {
    await server.close();
    // Server is recreated as Fastify doesn't support closing and restarting a server
    // https://github.com/fastify/fastify/issues/2411
    server = createServer();
    running = false;
    log("HTTP server server stopped");
  } catch (error) {
    running = false;
  }
}

async function onTypeExtracted(id: string, types: string) {
  const hole = getHole(id);

  if (!hole) {
    error("Hole", id, "was not found. This is not supposed to happen");
    return;
  }

  for (const fileName of hole.fileNames) {
    await updateTypes(hole, types, fileName);
  }
}

async function updateTypes(hole: Typehole, types: string, fileName: string) {
  let document = await vscode.workspace.openTextDocument(
    vscode.Uri.file(fileName)
  );

  if (!document) {
    error(
      "Document",
      fileName,
      "a typehole was referring to was not found. This is not supposed to happen"
    );
    return;
  }

  let ast = getAST(document.getText());

  let typeAliasNode = getTypeAliasForId(hole.id, ast);

  if (!typeAliasNode) {
    return;
  }

  const typeName = getTypeReferenceNameForId(hole.id, ast)!;

  /*
   * Type is imported from another file
   */
  const typeIsImportedFromAnotherFile = ts.isImportDeclaration(typeAliasNode);
  if (typeIsImportedFromAnotherFile) {
    const relativePath = tsquery(typeAliasNode, "StringLiteral")[0]
      ?.getText()
      // "./types.ts" -> types.ts
      .replace(/["']/g, "");

    const projectRoot = await getProjectRoot(document);

    if (!projectRoot) {
      return error("No project root was found when resolving module import");
    }

    const absolutePath = resolveImportPath(
      projectRoot,
      relativePath,
      document.uri.path
    );

    if (!absolutePath) {
      return error("TS Compiler couldn't resolve the import path");
    }

    try {
      document = await vscode.workspace.openTextDocument(
        vscode.Uri.file(absolutePath)
      );
    } catch (err) {
      return error(
        "Failed to open the document the imported type is referring to",
        absolutePath,
        err.message
      );
    }

    ast = getAST(document.getText());
    typeAliasNode = findDeclarationWithName(typeName, ast);
    if (!typeAliasNode) {
      return;
    }
  }

  const exported = tsquery(typeAliasNode.parent, "ExportKeyword").length > 0;
  const existingDeclarations = getAllDependencyTypeDeclarations(
    typeAliasNode.parent
  );

  const typesToBeInserted =
    (exported ? "export " : "") +
    types.replace("TypeholeRoot", typeName).trim();

  const workEdits = new vscode.WorkspaceEdit();

  existingDeclarations.forEach((node) => {
    const range = getEditorRange(node);
    workEdits.delete(document?.uri!, range);
  });

  workEdits.insert(
    document.uri,
    getEditorRange(typeAliasNode!.parent).start,
    typesToBeInserted
  );

  vscode.workspace.applyEdit(workEdits);

  try {
    await vscode.commands.executeCommand("editor.action.formatDocument");
  } catch (err) {
    error("Formatting the document failed", err.message);
  }
}

async function onUnserializable(id: string) {
  const editor = vscode.window.activeTextEditor;
  const document = editor?.document;
  if (!editor || !document) {
    return;
  }

  const ast = getAST(editor.document.getText());
  const holes = findTypeholes(ast);

  const hole = holes.find(
    (h) =>
      ts.isPropertyAccessExpression(h.expression) &&
      h.expression.name.getText() === id
  );

  if (hole) {
    const range = getEditorRange(hole);
    addWarning(document.uri.path, range);
  }
}
