<!-- HUMAN_TRANSLATION_REVIEW: pending independent native-speaker review -->
<!-- SOURCE_README_SHA256:8635035192b025eef1805227abb481104b1bb1084216947355814cdb1bbfd365 -->

# Taiwan-LLM-Sanitizer — Localización segura al chino tradicional de Taiwán

**Languages:** [繁體中文](README.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

Herramienta de código abierto para elegir vocabulario taiwanés, leer textos bilingües y preservar estructuras técnicas. No es un producto oficial de terceros. **MIT** · Founder / Steward: CA L.

## Funciones disponibles

| Release | Scope | Status |
| --- | --- | --- |
| **R13** | Local selection-based bilingual reading, no page-text rewrite | v0.6.0 Preview |
| **R11** | Explicit per-site personal glossary and conservative rollback | v0.5.0 Preview |
| **R14** | Offline provider capability / consent declarations; no remote transport | Research preview |
| **R15** | Protección local de estructuras Markdown/JSON/Prompt y vista previa con SHA256 | Vista preliminar independiente |
| **R12 / R6** | Frozen 100-case coverage and structural audit; not model correctness | Evaluation only |
| **R5, R8–R10** | Earlier lexical, human-choice and offline research tools | Preview / prototype |

[Releases](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases) · [R13 bilingual reader](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r13-bilingual-reader-preview-0.6.0) · [R11 glossary](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r11-manual-site-glossary-0.5.0).

## R15 — Local structure-preview toolkit

El [laboratorio R15 sin conexión](examples/TW_Structured_Integrity_Lab_R15_20261025.html) protege código, claves JSON, direcciones URL, roles y variables. Solo presenta los cambios elegidos manualmente; no traduce ni modifica archivos de origen automáticamente.

## Cómo leer sitios web con la herramienta general

La guía explica cómo seleccionar texto, comparar original y traducción, ajustar el vocabulario propio y revertir cambios. No distribuimos scripts, glosarios, parches ni recursos de juegos específicos. Respeta siempre las condiciones y derechos del sitio. **[Universal website localization guide](docs/WEBSITE_LOCALIZATION_GUIDE.md)**.

## Características del proyecto

Lenguaje según el contexto, protección de código y claves JSON, aceptación explícita, restauración prudente, privacidad local y afirmaciones verificables.

## Derechos de autor, marcas y privacidad

Que un material sea público no significa que pueda traducirse o redistribuirse libremente. La atribución, el uso sin fines de lucro o una nota de no afiliación no conceden autorización. [Third-party rights policy](docs/THIRD_PARTY_RIGHTS_POLICY.md) · [Privacy](PRIVACY.md) · [Security](SECURITY.md).

Son versiones preliminares: no garantizan exactitud de la traducción, compatibilidad universal ni permisos de terceros.

## Documentación y contribuciones

[Documentation](docs/FEATURES.md) · [Roadmap](docs/ROADMAP.md) · [Contributing](CONTRIBUTING.md) · [Major updates](CHANGELOG.md).
