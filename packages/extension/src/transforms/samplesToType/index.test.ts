import { samplesToType } from ".";

test("generates types and interfaces from samples", () => {
  expect(samplesToType([1, { a: 2 }, true, null])).toBe(
    `type TypeholeRoot = (boolean | TypeholeRootWrapper2 | null | number);
interface TypeholeRootWrapper2 {
  a: number;
}`
  );
  expect(samplesToType([{ a: 2 }])).toBe(
    `interface TypeholeRoot {
  a: number;
}`
  );
  expect(samplesToType([{ a: 2 }, { a: null }])).toBe(
    `interface TypeholeRoot {
  a?: number;
}`
  );

  expect(samplesToType([require("./redditResponse.json")])).toMatchSnapshot();
});
