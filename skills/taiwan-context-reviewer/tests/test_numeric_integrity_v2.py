"""Original numeric-sign regressions; no semantic-quality claim."""
import importlib.util
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('numeric_audit',ROOT/'scripts/audit_markdown.py')
A=importlib.util.module_from_spec(spec);spec.loader.exec_module(A)
class NumericIntegrity(unittest.TestCase):
 def test_negative_quantity_cannot_lose_sign(self):
  result=A.compare_texts('溫度 -3 度。','溫度 3 度。')
  self.assertEqual(result['status'],'BLOCKED_INTEGRITY')
 def test_scientific_quantity_cannot_lose_exponent_sign(self):
  result=A.compare_texts('容差 1e-3。','容差 1e3。')
  self.assertEqual(result['status'],'BLOCKED_INTEGRITY')
if __name__=='__main__':unittest.main()
