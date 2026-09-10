import { isValidElement, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { PALETTES, groupPivotOf, type Doc, type Item } from "../lib/tokens";
import { Preview } from "./Preview";

const hooks = vi.hoisted(() => ({
  refs: [] as { current: unknown }[],
  cursor: 0,
  effects: [] as (() => void | (() => void))[],
}));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => [typeof initial === "function" ? initial() : initial, vi.fn()],
  useRef: (current: unknown) => hooks.refs[hooks.cursor++] ?? (hooks.refs[hooks.cursor - 1] = { current }),
  useEffect: (effect: () => void | (() => void)) => { hooks.effects.push(effect); },
  useMemo: (value: () => unknown) => value(),
  useCallback: (callback: unknown) => callback,
}));
vi.mock("motion/react", () => ({
  AnimatePresence: "presence",
  motion: { div: "div", button: "button" },
  useReducedMotion: () => false,
  useIsPresent: () => true,
  useMotionValue: (value: number) => ({ get: () => value }),
  useTransform: () => 0,
  animate: vi.fn(),
}));
vi.mock("@/lib/tokens", () => import("../lib/tokens"));
vi.mock("@/lib/rail", () => import("../lib/rail"));
vi.mock("@/lib/railView", () => import("../lib/railView"));
vi.mock("@/lib/i18n", async () => ({ ...await import("../lib/i18n"), useLang: () => "en" }));
vi.mock("./M3Node", () => ({ M3Node: "node", Icon: "icon" }));
vi.mock("./ui", () => ({ IconBtn: "button" }));

const box = (id: string, size: number, size2: number): Item => ({ id, kind: "box", label: "", icon: null, variant: "filled", size, size2 });

const docOf = (style?: { rot?: number; opacity?: number }): Doc => ({
  frame: "phone",
  paletteKey: "purple",
  title: "",
  brief: "",
  frames: [{ id: "only", name: "Only", x: 0, y: 0, w: 412, h: 892 }],
  groups: [
    {
      id: "fg",
      x: 16,
      y: 100,
      axis: "x",
      free: true,
      rot: style?.rot,
      opacity: style?.opacity,
      pos: { a: { x: 0, y: 0 }, b: { x: 200, y: 10 } },
      items: [box("a", 100, 50), box("b", 40, 30)],
    },
  ],
});

type Element = ReactElement<Record<string, unknown>>;
function elements(node: unknown): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  return [node, ...elements(node.props.children)];
}

/* Like Preview.test.tsx, call the component as a function and read the element
 * tree; here the group wrapper of the one screen is what carries the style. */
function groupWrapper(style?: { rot?: number; opacity?: number }) {
  const tree = Preview({ doc: docOf(style), widths: {}, palette: PALETTES[0], startId: "only", onClose: vi.fn() });
  const screens = elements(tree).filter((element) => typeof element.type === "function" && "frame" in element.props);
  const screen = screens[0];
  if (!screen) throw new Error("no screen rendered");
  hooks.refs = [];
  hooks.cursor = 0;
  hooks.effects = [];
  const rendered = (screen.type as (props: Record<string, unknown>) => Element)(screen.props);
  const wrapper = elements(rendered).find((element) => element.props["data-preview-group"] === "fg");
  if (!wrapper) throw new Error("no group wrapper rendered");
  return wrapper.props.style as Record<string, unknown>;
}

describe("preview group rotation and transparency", () => {
  it("turns and fades a hand-made group around the centre of its bounds", () => {
    const style = groupWrapper({ rot: 30, opacity: 60 });
    expect(style.transform).toBe("rotate(30deg)");
    expect(style.opacity).toBe(0.6);
    expect(style.transformOrigin).toBe(groupPivotOf(docOf({ rot: 30, opacity: 60 }).groups[0], {}));
  });

  it("leaves a group without the fields untransformed and fully opaque", () => {
    const style = groupWrapper();
    expect(style.transform).toBeUndefined();
    expect(style.opacity).toBeUndefined();
    expect(style.transformOrigin).toBe(groupPivotOf(docOf().groups[0], {}));
  });

  it("keeps full opacity out of the style, as nothing needs overriding", () => {
    const style = groupWrapper({ rot: -90, opacity: 100 });
    expect(style.transform).toBe("rotate(-90deg)");
    expect(style.opacity).toBeUndefined();
  });
});
