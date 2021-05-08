import { EventEmitter } from "events";
import * as vscode from "vscode";
import { getId } from "./hole";
import { log } from "./logger";
import { findTypeholes, getAST } from "./parse/module";

export const events = new EventEmitter();

type TypeHole = { id: number; fileName: string };

let state = {
  warnings: {} as Record<string, vscode.Range[]>,
  holes: [] as TypeHole[],
  samples: {} as Record<string, any[]>,
};

export type State = typeof state;

export function getAvailableId() {
  if (state.holes.length === 0) {
    return 0;
  }
  return Math.max(...state.holes.map((h) => h.id)) + 1;
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
  setState({
    ...state,
    warnings: {
      ...state.warnings,
      [fileName]: getWarnings(fileName).concat(range),
    },
  });
}

export function getSamples(id: number) {
  return getState().samples[id] || [];
}

export function addSample(id: number, sample: any) {
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

function clearSamples(id: number, currentState: typeof state) {
  return {
    ...currentState,
    samples: {
      ...currentState.samples,
      [id]: [],
    },
  };
}

function createTypehole(id: number, fileName: string) {
  const hole = { id, fileName };
  const currentState = getState();
  setState({ ...currentState, holes: [...currentState.holes, hole] });
}

function removeTypehole(id: number) {
  const currentState = getState();
  setState(
    clearSamples(id, {
      ...currentState,
      holes: currentState.holes.filter((h) => h.id !== id),
    })
  );
}

function setState(newState: typeof state): void {
  state = newState;
  events.emit("change", newState);
}

export function getState() {
  return state;
}

export function onFileDeleted(fileName: string) {
  getState()
    .holes.filter((hole) => hole.fileName === fileName)
    .forEach((h) => removeTypehole(h.id));
}

export function onFileChanged(fileName: string, content: string) {
  const knownHolesInThisFile = state.holes.filter(
    (hole) => hole.fileName === fileName
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
      removeTypehole(holeId);
    }
  });
}

export function getHole(id: number) {
  return state.holes.find((hole) => hole.id === id);
}
