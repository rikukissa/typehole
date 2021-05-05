import { tsquery } from "@phenomnomnominal/tsquery";
import { getAST } from "../../parse/module";

import {
  findAllDependencyTypeDeclarations,
  getAllDependencyTypeDeclarations,
  getTypeAliasForId,
} from "./index";

test("finds all dependency type declarations from an ast when given one interface", () => {
  const ast = getAST(file);
  const typeAliasNode = getTypeAliasForId("t", ast)!;

  expect(
    getAllDependencyTypeDeclarations(typeAliasNode.parent).map((n) =>
      n.name.getText()
    )
  ).toEqual(["Reddit", "ArrayItemA", "ArrayItemB", "IData", "IChildrenItem"]);
});

const file = `
  import React, { useEffect } from "react";
  import logo from "./logo.svg";
  import "./App.css";
  import typehole from "typehole";

  interface Reddit {
    kind: string;
    array: ArrayItemA | ArrayItemB;
    data: IData;
  }
  interface IData {
    modhash?: string;
    dist?: number;
    children?: IChildrenItem[];
  }
  interface IChildrenItem {
    kind: string;
    data: IData;
  }

  type ArrayItemA = number
  type ArrayItemB = {data: IData}

  type Numberz = number;

  function App() {
    useEffect(() => {
      async function fetchVideos() {
        const res = await fetch("https://www.reddit.com/r/videos.json");

        const data: Reddit = typehole.t(await res.json());

        const a: Numberz = typehole.t1(1 + 1);
      }
      fetchVideos();
    }, []);

    return (
      <div></div>
      );
    }

    `;

test("finds all dependency type declarations from an ast when given one interface", () => {
  const ast = getAST(`
        type Root = {a: (ArrayItemA | ArrayItemB)[]}
        type ArrayItemA = number
        type ArrayItemB = {data: boolean}
      `);
  const node = tsquery.query(ast, 'Identifier[name="Root"]')[0];
  expect(
    findAllDependencyTypeDeclarations(node.parent).map((n) => n.name.getText())
  ).toEqual(["Root", "ArrayItemA", "ArrayItemB"]);
});

test("finds all dependency type declarations from an ast when given one interface", () => {
  const ast = getAST(`
        type Root = {a: Array<ArrayItemA | ArrayItemB>}
        type ArrayItemA = number
        type ArrayItemB = {data: boolean}
      `);
  const node = tsquery.query(ast, 'Identifier[name="Root"]')[0];
  expect(
    findAllDependencyTypeDeclarations(node.parent).map((n) => n.name.getText())
  ).toEqual(["Root", "ArrayItemA", "ArrayItemB"]);
});

test("finds all dependency type declarations from an ast when there are array types in union", () => {
  const ast = getAST(`
    type AutoDiscovered = IRootObjectItem[] | (string | boolean | number)[];
    interface IRootObjectItem {
        a?: number;
    }`);

  const node = tsquery.query(ast, 'Identifier[name="AutoDiscovered"]')[0];
  expect(
    findAllDependencyTypeDeclarations(node.parent).map((n) => n.name.getText())
  ).toEqual(["AutoDiscovered", "IRootObjectItem"]);
});
