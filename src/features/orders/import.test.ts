import { describe, expect, it } from "vitest";
import { groupOrderRows } from "./import";

describe("groupOrderRows", () => {
  it("groups lines by ref and reports invalid rows", () => {
    const base = { customer: "Ana", address: "Calle 1", commune: "Ñuñoa", phone: "", carrier: "Starken" };
    const groups = groupOrderRows([
      { ...base, ref: "A1", sku: "X", qty: "2" },
      { ...base, ref: "A1", sku: "Y", qty: "1" },
      { ...base, ref: "B2", sku: "X", qty: "0" },
      { ...base, ref: "", sku: "X", qty: "1" },
    ]);
    expect(groups).toHaveLength(3);
    expect(groups[0].order?.lines).toEqual([{ sku: "X", qty: 2 }, { sku: "Y", qty: 1 }]);
    expect(groups[1].errors[0]).toContain("Fila 4");
    expect(groups[2].errors[0]).toContain("falta ref");
  });
});
