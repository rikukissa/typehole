import * as vscode from "vscode";
import f from "fastify";
import {
  getTypeAliasForId,
  getAllDependencyTypeDeclarations,
} from "./transforms/insertTypes";
import * as ts from "typescript";
import { findTypeholes, getAST } from "./parse/module";
import { getEditorRange } from "./editor/utils";
import { error, log } from "./logger";

import { json2ts } from "json-ts";
import { addWarning } from "./state";
import { typeNamesToPascalCase } from "./transforms/typeNamesToPascalCase";

const fastify = f({ logger: true });
fastify.register(require("fastify-cors"));

let running = false;
export function isServerRunning() {
  return running;
}

export async function startListenerServer() {
  log("Requesting HTTP server start");
  running = true;

  fastify.post("/type", async (request, reply) => {
    const body = request.body as any;
    onTypeExtracted(body.id, body.interfaces as string);
    return reply.code(200).send();
  });

  fastify.post("/samples", async (request, reply) => {
    const body = request.body as any;
    log(body.id, "-", "New sample", JSON.stringify(request.body), "received");

    const typeString = json2ts(JSON.stringify(body.sample));

    onTypeExtracted(body.id, typeString);

    return reply.code(200).send();
  });

  fastify.post("/unserializable", async (request, reply) => {
    const body = request.body as any;
    error("Value in typehole", body.id, "is unserializable");
    onUnserializable(body.id);
    return reply.code(200).send();
  });

  try {
    await fastify.listen(17341);
    log("HTTP server started");
  } catch (err) {
    error("Starting HTTP server failed");
    running = false;
    console.error(err);
    throw err;
  }
}

export async function stopListenerServer() {
  try {
    await fastify.close();
  } catch (error) {
    running = false;
  }
}

async function onTypeExtracted(id: string, types: string) {
  const editor = vscode.window.activeTextEditor;
  const document = editor?.document;
  if (!editor || !document) {
    return;
  }
  const ast = getAST(editor.document.getText());
  const typeAliasNode = getTypeAliasForId(id, ast);
  if (!typeAliasNode) {
    return;
  }
  const typeName = typeAliasNode.getText();

  const existingDeclarations = getAllDependencyTypeDeclarations(
    typeAliasNode.parent
  );

  await editor.edit((editBuilder) => {
    existingDeclarations.forEach((node) => {
      const range = getEditorRange(node);
      editBuilder.delete(range);
    });
  });

  const typesToBeInserted = typeNamesToPascalCase(
    types.replace("IRootObject", typeName)
  ).trim();

  await editor.edit((editBuilder) => {
    editBuilder.insert(
      getEditorRange(typeAliasNode.parent).start,
      typesToBeInserted
    );
  });
  // TODO We could also only format the types we added
  await vscode.commands.executeCommand("editor.action.formatDocument");
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
