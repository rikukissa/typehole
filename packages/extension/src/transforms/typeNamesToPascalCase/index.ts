import pascalCase from "pascalcase";
import { Project } from "ts-morph";

export function typeNamesToPascalCase(typeString: string) {
  const project = new Project();
  const sourceFile = project.createSourceFile("tmp.ts", typeString);

  sourceFile
    .getInterfaces()
    .forEach((node) => node.rename(pascalCase(node.getName())));
  sourceFile
    .getTypeAliases()
    .forEach((node) => node.rename(pascalCase(node.getName())));

  return sourceFile.print();
}
