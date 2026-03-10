import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HrDataStore } from "./hr-data.store";

describe("HrDataStore", () => {
  it("genera cedolino e lo rende disponibile", async () => {
    const store = new HrDataStore();
    const payslip = await store.generatePayslip("u-employee", "2026-03");
    assert.equal(payslip.userId, "u-employee");
    assert.ok(payslip.netSalary > 0);
    const list = await store.listPayslips("u-employee");
    assert.equal(list.length, 1);
  });
});
