<!-- HUMAN_TRANSLATION_REVIEW: pending independent native-speaker review -->
<!-- SOURCE_README_SHA256:c4e5f24061fd15beef7c6226f0facf66c8beffcb853cd00771fd72e10075d14a -->

# Taiwan-LLM-Sanitizer — Localización segura al chino tradicional de Taiwán

**Languages:** [繁體中文](README.md) · [简体中文](README.zh-CN.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

Herramienta de código abierto para elegir vocabulario taiwanés, leer textos bilingües y preservar estructuras técnicas. No es un producto oficial de terceros. **MIT** · Founder / Steward: CA L.
### R17.2 | Revisión de terminología de Taiwán para textos creados con IA

[Empezar](START_HERE.html) · [Asistente local R17.2](examples/TW_Wording_Assistant_R172_20261027.html) · [Guía para Codex, Claude y Grok](docs/AI_WORKFLOWS_CODEX_CLAUDE_GROK.en.md). Pega Markdown chino propio o autorizado, revisa cada sugerencia y descarga un archivo nuevo tras la revisión estructural. Sin traducción automática en la nube, sin integración nativa con Grok ni certificación lingüística.


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

## Nueve casos de uso originales

[Consultar los nueve ejemplos](docs/USAGE_EXAMPLES.es.md) (EX01–EX09): vocabulario contextual de Taiwán, lectura por selección R13, glosario manual R11, capacidad R14 y protección Markdown/JSON/Prompt de R15.

En una **página ficticia parecida a un juego web**, el texto HTML seleccionable `Open settings` podría verse mediante R13 o revisarse con el glosario R11, **solo cuando los términos del sitio lo permitan**. El texto dibujado con Canvas/WebGL no es compatible. No se afirma haber probado ningún juego real ni se distribuyen scripts o diccionarios específicos. [Guía general](docs/WEBSITE_LOCALIZATION_GUIDE.md).

## R16 — Estudio de seguridad para localización sin conexión (Shadow Preview independiente)

[Abrir R16 sin conexión](examples/TW_Localization_Safety_Studio_R16_20261026.html) · [Uso y límites de seguridad](docs/R16_LOCALIZATION_STUDIO.md) · [Ejemplo original de Markdown](examples/r16/sample_readme.md). Permite inspeccionar segmentos protegidos de Markdown／JSON／Prompt, introducir sugerencias manualmente, revisar las diferencias y descargar una vista previa como **archivo nuevo**. El informe de metadatos no contiene el texto original; la vista previa descargada voluntariamente sí puede contener el texto introducido. **No traduce automáticamente, no envía datos a la nube y no sobrescribe el original**. No se garantiza compatibilidad con toda la sintaxis ni calidad semántica.

## R17 — Auditoría local de integridad de documentos (solo lectura)

[Abrir el verificador R17 de enlaces Markdown](examples/TW_Document_Trust_Graph_R17_20261026.html) · [Guía y límites](docs/R17_DOCUMENT_TRUST_GRAPH.es.md). Selecciona de forma explícita archivos Markdown que tengas derecho a procesar, verifica enlaces relativos y anclas y exporta un informe de metadatos sin el texto original. Los enlaces externos o no verificables se marcan UNKNOWN; nunca se consulta la red. **No traduce ni modifica los archivos de origen.**

## R17.1 | Cada Release incluye todas las herramientas admitidas

Consulta la [guía de distribución e integridad All-Tools](docs/ALL_TOOLS_RELEASE.md). Cada versión oficial debe incluir todas las extensiones de Chrome, los scripts de Tampermonkey, los 13 laboratorios HTML sin conexión, el kit público de calidad R6 y el paquete de CLI/Skill para desarrolladores que sigan admitidos y puedan redistribuirse legalmente. Las herramientas sin cambios conservan su versión y SHA256 originales. Se comprueban todos los adjuntos del borrador antes de publicar. Nunca se reincorporan paquetes específicos de terceros retirados por derechos. La [Release R17.1](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/all-tools-suite-v17.1.0) solo se considera disponible tras verificarse el CI oficial y sus adjuntos.

**R17.3, solo investigación:** Consulta la [comparación imparcial y el protocolo voluntario](docs/R173_COMPARISON_AND_ADOPTION.en.md). **Aún no existen resultados verificados que demuestren superioridad frente a OpenCC, LLM o revisión humana.** Las herramientas de Suite 17.2.0 siguen sin cambios.

<!-- ALL_TOOLS_CATALOG: suite=17.2.0; tools=27; standalone=22; tool_ids_sha256=f1c06a60d53960a91e68f3b6184e801bffc6c5442774097a1e167a38f97aa769 -->

La validación compara los archivos reales y descargados con el SHA256 original fijado y la revisión de Git. Se descargan por separado los archivos del borrador y los publicados; una etiqueta existente se verifica sin sobrescribirla. Las seis guías siguen pendientes de revisión humana (HUMAN_TRANSLATION_REVIEW_PENDING).
