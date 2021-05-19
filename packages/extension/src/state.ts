import { EventEmitter } from "events";
import * as vscode from "vscode";
import { getId } from "./hole";
import { log } from "./logger";
import { findTypeholes, getAST } from "./parse/module";
import { omit, unique } from "./parse/utils";

export const events = new EventEmitter();

export type Typehole = { id: string; fileNames: string[] };

let state = {
  nextUniqueId: 0,
  warnings: {} as Record<string, vscode.Range[]>,
  holes: {} as Record<string, Typehole>,
  samples: {} as Record<string, any[]>,
};

export type State = typeof state;

export function getNextAvailableId() {
  return state.nextUniqueId;
}

export function clearWarnings(fileName: string) {
  const state = getState();
  setState({ ...state, warnings: { ...state.warnings, [fileName]: [] } });
}

export function getWarnings(fileName: string) {
  const state = getState();
  return state.warnings[fileName] || [];
}

export function addWarning(fileName: string, range: vscode.Range) {
  const state = getState();
  const alreadyExists = getWarnings(fileName).some(
    (w) => w.start.isEqual(range.start) && w.end.isEqual(range.end)
  );
  if (alreadyExists) {
    return;
  }

  setState({
    ...state,
    warnings: {
      ...state.warnings,
      [fileName]: getWarnings(fileName).concat(range),
    },
  });
}

export function getSamples(id: string) {
  return getState().samples[id] || [];
}

export function addSample(id: string, sample: any) {
  const currentState = getState();
  const existing = getSamples(id);

  const newSamples = [sample].concat(existing);

  setState({
    ...currentState,
    samples: {
      ...currentState.samples,
      [id]: newSamples,
    },
  });
  return newSamples;
}

function clearSamples(id: string, currentState: typeof state) {
  return {
    ...currentState,
    samples: {
      ...currentState.samples,
      [id]: [],
    },
  };
}

function createTypehole(id: string, fileName: string) {
  const existingHole = getHole(id);
  const hole = existingHole
    ? { id, fileNames: existingHole.fileNames.concat(fileName).filter(unique) }
    : { id, fileNames: [fileName] };
  const currentState = getState();
  setState({
    ...currentState,
    nextUniqueId: currentState.nextUniqueId + 1,
    holes: { ...currentState.holes, [id]: hole },
  });
}

function removeTypeholeFromFile(id: string, fileName: string) {
  const currentState = getState();

  const hole = getHole(id);
  if (!hole) {
    return;
  }
  const fileFilesWithoutFile = hole?.fileNames.filter(
    (file) => file !== fileName
  );
  const wasOnlyFileWithTypehole = fileFilesWithoutFile.length === 0;

  if (wasOnlyFileWithTypehole) {
    const newHoles = omit(currentState.holes, id);
    setState(
      clearSamples(id, {
        ...currentState,
        holes: newHoles,
      })
    );
  } else {
    const holeWithoutFile = { ...hole, fileNames: fileFilesWithoutFile };
    setState({
      ...currentState,
      holes: { ...currentState.holes, [id]: holeWithoutFile },
    });
  }
}

function setState(newState: typeof state): void {
  state = newState;

  events.emit("change", newState);
}

export function getState() {
  return state;
}

export function getAllHoles() {
  return Object.values(getState().holes);
}

export function onFileDeleted(fileName: string) {
  getAllHoles()
    .filter((hole) => hole.fileNames.includes(fileName))
    .forEach((h) => removeTypeholeFromFile(h.id, fileName));
}

export function onFileChanged(fileName: string, content: string) {
  const knownHolesInThisFile = getAllHoles().filter((hole) =>
    hole.fileNames.includes(fileName)
  );
  const knownIds = knownHolesInThisFile.map(({ id }) => id);

  const ast = getAST(content);
  const holesInDocument = findTypeholes(ast).map(getId);

  // Update state to reflect current holes in the document
  holesInDocument.forEach((holeId) => {
    const newHoleWasAdded = !knownIds.includes(holeId);
    if (newHoleWasAdded) {
      log("Found a new typehole from", fileName);
      createTypehole(holeId, fileName);
    }
  });
  knownIds.forEach((holeId) => {
    const holeHasBeenRemoved = !holesInDocument.includes(holeId);
    if (holeHasBeenRemoved) {
      removeTypeholeFromFile(holeId, fileName);
    }
  });
}

export function getHole(id: string): Typehole | undefined {
  return state.holes[id];
}
