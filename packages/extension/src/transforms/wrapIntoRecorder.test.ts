import { tsquery } from "@phenomnomnominal/tsquery";
import { getAST } from "../parse/module";
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

  const actual = wrapIntoRecorder(0, getAST(selectedExpression));
  expect(actual).toMatchSnapshot();
});

test("wraps objects with inner typeholes", () => {
  const ast = getAST(`const foo = { bar: typehole.t1(234) }`);

  const actual = wrapIntoRecorder(
    0,
    tsquery.query(ast, "ObjectLiteralExpression")[0]
  );

  expect(actual).toMatchSnapshot();
});

test("wraps expressions into recorder call", () => {
  const ast = getAST(
    `tsquery.query(ast, "InterfaceDeclaration > Identifier[name='AutoDiscover']")`
  );
  const actual = wrapIntoRecorder(0, tsquery.query(ast, "CallExpression")[0]);
  expect(actual).toMatchSnapshot();
});

test("wraps literals into recorder calls", () => {
  const withAST = (code: string) => getAST(code).getChildAt(0).getChildAt(0);
  expect(wrapIntoRecorder(0, withAST(`1 + 3 + 4`))).toMatchSnapshot();
  expect(wrapIntoRecorder(0, withAST(`"moro" + "moro"`))).toMatchSnapshot();
  expect(wrapIntoRecorder(0, withAST(`["moro", "moro"]`))).toMatchSnapshot();
  expect(wrapIntoRecorder(0, withAST(`[() => 3, "moro"]`))).toMatchSnapshot();
});
