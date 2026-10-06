import assert from "node:assert/strict";
import { test } from "node:test";

import { needsMoreInput } from "../../src/md_term/assets/js/python.js";

test("needsMoreInput detects lines that open a block", () => {
  for (const line of ["def f():", "for i in x:  # loop", "x = [1,", "f(1, (2", "total = 1 + \\"]) {
    assert.equal(needsMoreInput(line), true, line);
  }
  for (const line of ["x = 1", "f(1)", 'print("(")', "d = {'a': ':'}", "x[1:2]", "# note:"]) {
    assert.equal(needsMoreInput(line), false, line);
  }
});
