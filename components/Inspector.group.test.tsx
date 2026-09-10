import { isValidElement, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { PALETTES, type Palette } from "../lib/tokens";
import { Inspector } from "./Inspector";

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
vi.mock("@/lib/tokens", () => import("../lib/tokens"));
vi.mock("@/lib/i18n", async () => ({ ...await import("../lib/i18n"), useLang: () => "en" }));
vi.mock("@/lib/ai", () => import("../lib/ai"));
vi.mock("./M3Node", () => ({ Icon: "icon" }));
vi.mock("./IconPicker", () => ({ IconPicker: "picker" }));
vi.mock("./AiPanel", () => ({ AiWriteBtn: "button" }));
vi.mock("./ui", () => ({
  ButtonRun: "div",
  CardLayoutPicker: "div",
  CornerIcon: "span",
  Field: "input",
  IconBtn: "button",
  Section: "section",
  Segmented: "div",
  SizePresets: "div",
  Slider: "slider",
  TextTokenChips: "div",
  TidyButton: "button",
  Toggle: "button",
  TokenChips: "div",
}));

type Element = ReactElement<Record<string, unknown>>;
function elements(node: unknown): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  return [node, ...elements(node.props.children)];
}

type InspectorProps = Parameters<typeof Inspector>[0];
const base: Partial<InspectorProps> = {
  ai: { ready: false, busy: false, onRun: vi.fn(), onCancel: vi.fn() },
  item: null,
  palette: PALETTES[0] as Palette,
  frames: [],
  onChange: vi.fn(),
  onDelete: vi.fn(),
  onDuplicate: vi.fn(),
};

function sliders(props: Partial<InspectorProps>) {
  hooks.refs = [];
  hooks.cursor = 0;
  hooks.effects = [];
  const tree = Inspector({ ...base, ...props } as InspectorProps);
  return elements(tree).filter((element) => element.type === "slider");
}

describe("inspector group style sliders", () => {
  it("offers rotation and transparency when a hand-made group is selected", () => {
    const found = sliders({ multi: 3, grouped: true, groupStyle: { rot: 30, opacity: 60 }, onGroupStyle: vi.fn() });
    const rotation = found.find((element) => element.props.icon === "rotate_right");
    const opacity = found.find((element) => element.props.icon === "opacity");
    expect(rotation?.props).toMatchObject({ value: 30, min: -180, max: 180, unit: "°" });
    expect(opacity?.props).toMatchObject({ value: 60, min: 0, max: 100, unit: "%" });
  });

  it("hands a moved slider to the page as a patch on the group", () => {
    const onGroupStyle = vi.fn();
    const found = sliders({ multi: 2, grouped: true, groupStyle: { rot: 30, opacity: 60 }, onGroupStyle });
    const rotation = found.find((element) => element.props.icon === "rotate_right");
    (rotation?.props.onChange as (v: number) => void)(45);
    expect(onGroupStyle).toHaveBeenCalledWith({ rot: 45 });
  });

  it("keeps the sliders to a whole hand-made group", () => {
    expect(sliders({ multi: 3, grouped: true, groupStyle: { rot: 30 }, onGroupStyle: vi.fn() }).length).toBe(2);
    /* a group without the fields yet still gets the sliders, resting on their defaults */
    const fresh = sliders({ multi: 3, grouped: true, onGroupStyle: vi.fn() });
    expect(fresh.find((element) => element.props.icon === "rotate_right")?.props).toMatchObject({ value: 0, min: -180, max: 180 });
    expect(fresh.find((element) => element.props.icon === "opacity")?.props).toMatchObject({ value: 100, min: 0, max: 100 });
    expect(sliders({ multi: 3, groupStyle: { rot: 30 }, onGroupStyle: vi.fn() }).length).toBe(0);
  });
});
