---
name: test-driven-development
description: Use this skill when implementing new features, modifying business logic, or fixing complex bugs. Enforces the Red-Green-Refactor cycle and verification before implementation.
---

# Test-Driven Development (TDD) Skill

This skill enforces software engineering discipline through the **Red-Green-Refactor** cycle. It prevents regressions, guarantees mathematical correctness in business calculations, and verifies that production code behaves strictly according to specifications.

---

## The Core Rule of TDD
**Never modify or add production logic without first writing an executable test that fails.**
If you write code before the test exists, you cannot prove that the test would catch the defect or that the implementation is minimal.

---

## The RED-GREEN-REFACTOR Cycle

### 1. RED: Write a Failing Verification Script
- Before touching `api.py`, `database.py`, or calculation formulas, create a scratch script in the conversation scratch directory or run a test command.
- Define the inputs, invoke the target logic, and assert expected outputs.
- Run the test and **confirm that it fails** for the expected reason (e.g., function returns wrong value, column does not exist, detracción calculated with wrong percentage).

### 2. GREEN: Implement Minimal Working Code
- Write the minimal code necessary to make the test pass.
- Do not anticipate unrequested features or over-engineer abstractions at this stage.
- Run the test script again and confirm **it passes (Green)**.

### 3. REFACTOR: Clean, Optimize & Protect Invariants
- Refactor for readability, performance, and maintainability:
  - Eliminate duplicate queries or loops.
  - Ensure SQL statements use parameterized queries (`?`, never string formatting).
  - Check error handling and return structures `{'ok': True, ...}` / `{'ok': False, 'error': str(e)}`.
- Re-run the verification script to ensure tests remain completely green.

---

## Critical Testing Domains in Nicole ERP

### A. SUNAT & Peruvian Billing Math
- **IGV (18%)**: `subtotal * 0.18`, rounded to 2 decimal places with `round(val, 2)`.
- **Detracciones**:
  - Applicable to services exceeding `S/ 700.00`.
  - Typical rates: 10% or 12%.
  - `neto_a_pagar = total - detraccion`.
  - Banco de la Nación accounts: `00046317769` or `00771005578`.

### B. Pharmacokinetic Decay Modeling
- Injections half-life simulations for Estradiol Valerate (EV).
- Ensure exponential decay modeling follows standard 1-compartment / 2-compartment pharmacokinetic formulas:
  $$C(t) = \frac{D \cdot k_a}{V_d \cdot (k_a - k_e)} (e^{-k_e t} - e^{-k_a t})$$
- Verify projection points generate positive floats without NaN or division by zero.

### C. UTN Academic Correlatives
- Ensure student cannot enroll in or approve a subject if prerequisite correlative codes are missing or unapproved in `curriculum_status`.
