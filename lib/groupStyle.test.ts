import { describe, expect, it } from "vitest";
import { GAP, groupPivotOf, type Group, type Item } from "./tokens";

const box = (id: string, size: number, size2: number): Item => ({ id, kind: "box", label: "", icon: null, variant: "filled", size, size2 });

describe("groupPivotOf", () => {
  it("is the centre of a lone part, measured from the group's anchor", () => {
    const g: Group = { id: "g", x: 10, y: 20, axis: "x", items: [box("a", 100, 50)] };
    expect(groupPivotOf(g, {})).toBe("50px 25px");
  });

  it("is the centre of the bounds a hand-made group's offsets make", () => {
    const g: Group = {
      id: "g",
      x: 10,
      y: 20,
      axis: "x",
      free: true,
      pos: { a: { x: 0, y: 0 }, b: { x: 200, y: 10 } },
      items: [box("a", 100, 50), box("b", 40, 30)],
    };
    expect(groupPivotOf(g, {})).toBe("120px 25px");
  });

  it("is the centre of a connected run, gaps included", () => {
    const g: Group = { id: "g", x: 0, y: 0, axis: "x", items: [box("a", 100, 50), box("b", 40, 50)] };
    expect(groupPivotOf(g, {})).toBe(`${(100 + GAP + 40) / 2}px 25px`);
  });
});
