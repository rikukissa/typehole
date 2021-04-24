import { findTypeholes, getAST } from "./module";

test("finds correct amount of typeholes", () => {
  expect(findTypeholes(getAST(file)).length).toEqual(2);
});

test("returns holes in creation order", () => {
  expect(
    findTypeholes(getAST(file)).map((n: any) => n.expression.name.getText())
  ).toEqual(["t", "t1"]);
});

const file = `import logo from "./logo.svg";
import "./App.css";
import typehole from "typehole";

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={typehole.t1(logo)} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to {typehole.t("reload")}
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;`;
