import { wrapIntoRecorder } from "./wrapIntoRecorder";

test("wraps function declaration into a recorder", () => {
  const selectedExpression = `
  function App() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p>
            Edit <code>src/App.tsx</code> and save to{" "}
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
  `;
  const actual = wrapIntoRecorder(0, selectedExpression);
  expect(actual).toMatchSnapshot();
});

test("wraps expressions into recorder call", () => {
  const actual = wrapIntoRecorder(
    0,
    `
  tsquery.query(
    ast,
    "InterfaceDeclaration > Identifier[name='AutoDiscover']"
  )
  `
  );
  expect(actual).toMatchSnapshot();
});

test("wraps literals into recorder calls", () => {
  expect(wrapIntoRecorder(0, `1 + 3 + 4`)).toMatchSnapshot();
  expect(wrapIntoRecorder(0, `"moro" + "moro"`)).toMatchSnapshot();
  expect(wrapIntoRecorder(0, `["moro", "moro"]`)).toMatchSnapshot();
  expect(wrapIntoRecorder(0, `[() => 3, "moro"]`)).toMatchSnapshot();
});
