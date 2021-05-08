import f from "fastify";
import { json2ts } from "json-ts";
import * as ts from "typescript";
import * as vscode from "vscode";

import { getEditorRange } from "./editor/utils";
import { error, log } from "./logger";
import { findTypeholes, getAST } from "./parse/module";
import { addSample, addWarning } from "./state";
import {
  getAllDependencyTypeDeclarations,
  getTypeAliasForId,
} from "./transforms/insertTypes";
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
    log(body.id, "-", "New type", JSON.stringify(request.body), "received");
    await onTypeExtracted(body.id, body.interfaces as string);
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

    const serializedSample = JSON.stringify(body.sample);

    const typeString = json2ts(serializedSample);
    addSample(body.id, body.sample);

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

  const typesToBeInserted = typeNamesToPascalCase(
    types.replace("IRootObject", typeName)
  ).trim();

  await editor.edit((editBuilder) => {
    existingDeclarations.forEach((node) => {
      const range = getEditorRange(node);
      editBuilder.delete(range);
    });

    editBuilder.insert(
      getEditorRange(typeAliasNode.parent).start,
      typesToBeInserted
    );
  });

  try {
    // TODO We could also only format the types we added
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
