"""R19 exact-source intake. RED-phase scaffold; no extraction or execution."""
from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path

MAX_TASK_BYTES = 8 * 1024 * 1024
MAX_MEMBER_BYTES = 16 * 1024 * 1024
MAX_TOTAL_BYTES = 64 * 1024 * 1024
MAX_MEMBERS = 2048
HTML_SUFFIX = 'examples/TW_First_Result_Studio_R19_20261101.html'

@dataclass(frozen=True)
class Contract:
    task_sha256: str
    task_bytes: int
    source_sha256: str
    source_bytes: int
    html_sha256: str
    html_bytes: int
    runner_sha256: str
    kind: str = 'SYNTHETIC_TEST'

OFFICIAL = Contract(
    '5ef57fa1522245de20a4e14dd2d6698a8c82af294ab1be13f8e8c8611ee9a18d', 3526829,
    '6de12ac92967a1dddb37f3d3577276b97399de697a5d3aab9f2e3b7f0a6c353d', 3424117,
    '33c9455b08f4e412fe1f4474482ed9fe013714f36f33ae367e0d39421e094d5a', 136680,
    'f3689d92020aec54d8f59e556f83e4dc795d8232499eca750c5f1a8b1b0c1bd8',
    'PINNED_R19_R2',
)

def inspect_task(path: Path | None, contract: Contract = OFFICIAL) -> dict:
    return {'schema': 'tls.r19.native-intake.v1', 'intake_state': 'UNIMPLEMENTED',
            'reason_code': 'UNIMPLEMENTED', 'native_status': 'NOT_RUN',
            'promotion': 'NONE', 'contract_kind': contract.kind,
            'source_identity_verified': False, 'observed': {}}
