import * as vscode from "vscode";
import f from "fastify";
import {
  getTypeAliasForId,
  getAllDependencyTypeDeclarations,
} from "./transforms/insertTypes";
import { mergeInterfaces } from "./transforms/mergeInterfaces";

import { getAST } from "./parse/module";
import { getEditorRange } from "./editor/utils";
import { getHole } from "./state";
import { clientIdToStateId } from "./hole";
import { error, log } from "./logger";

const fastify = f({ logger: true });
fastify.register(require("fastify-cors"));

let running = false;
export function isServerRunning() {
  return running;
}

export async function startListenerServer() {
  running = true;
  fastify.post("/type", async (request, reply) => {
    const body = request.body as any;

    onTypeExtracted(body.id, body.interfaces as string);
    return {};
  });

  try {
    await fastify.listen(17341);
  } catch (err) {
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
  log("Received new types for id", id.toString());
  const fileWhereTypeholeIs = getHole(clientIdToStateId(id))?.fileName;
  console.log(fileWhereTypeholeIs);
  console.log(types);

  if (!fileWhereTypeholeIs) {
    error("Cannot find a file for typehole id", id);
    return;
  }
  let document: null | vscode.TextDocument = null;

  try {
    document = await vscode.workspace.openTextDocument(
      vscode.Uri.file(fileWhereTypeholeIs)
    );
  } catch (error) {
    return error("Failed to open document", fileWhereTypeholeIs);
  }

  const editor = await vscode.window.showTextDocument(document, 1, false);

  const ast = getAST(document.getText());
  const typeAliasNode = getTypeAliasForId(id, ast);
  if (!typeAliasNode) {
    return;
  }
  const typeName = typeAliasNode.getText();
  // Array is placed by the runtime library so all samples affect the outcome
  const isSimpleType = !types.includes("type IRootObject = IRootObjectItem[];");
  const typesWithoutArrayRoot = isSimpleType
    ? types
        .replace("IRootObject", typeName)
        .replace("IRootObjectItem[]", "IRootObjectItem")
    : types
        .replace("type IRootObject = IRootObjectItem[];", "")
        .replace("IRootObjectItem", typeName);

  const existingDeclarations = getAllDependencyTypeDeclarations(
    typeAliasNode.parent
  );

  return editor.edit((editBuilder) => {
    existingDeclarations.forEach((node) => {
      const range = getEditorRange(node);
      editBuilder.delete(range);
    });
    editBuilder.insert(
      getEditorRange(typeAliasNode.parent).start,
      mergeInterfaces(typesWithoutArrayRoot)
    );
  });
}
