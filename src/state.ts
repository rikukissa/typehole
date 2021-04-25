import { getId } from "./hole";
import { findTypeholes, getAST } from "./parse/module";

type TypeHole = { id: number; fileName: string };

let state = { holes: [] as TypeHole[] };

export function getAvailableId() {
  return Math.max(...state.holes.map((h) => h.id)) + 1;
}

function createTypehole(id: number, fileName: string) {
  const hole = { id, fileName };
  const currentState = getState();
  setState({ ...currentState, holes: [...currentState.holes, hole] });
}

function removeTypehole(id: number) {
  const currentState = getState();
  setState({
    ...currentState,
    holes: currentState.holes.filter((h) => h.id !== id),
  });
}

function setState(newState: typeof state): void {
  state = newState;
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
