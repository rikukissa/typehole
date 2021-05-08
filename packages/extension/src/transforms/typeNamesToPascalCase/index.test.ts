import { typeNamesToPascalCase } from ".";

test("finds all dependency type declarations from an ast when given one interface", () => {
  const typeString = `
  interface AutoDiscovered {
    available_tenants: IAvailable_tenants;
  }

  interface IAvailable_tenants {
    primary: IPrimary;
  }`;
  const result = typeNamesToPascalCase(typeString);

  expect(result).toMatchSnapshot();
});
