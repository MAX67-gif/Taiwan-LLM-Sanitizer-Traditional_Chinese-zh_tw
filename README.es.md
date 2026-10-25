<!-- SOURCE_README_SHA256:b6e6bbd92d0e4678dea92d845dff58c18013802a07aa19ec8437de0b03925008 -->
<!-- HUMAN_TRANSLATION_REVIEW: pending independent native-speaker review -->
# Taiwan-LLM-Sanitizer | Localización segura al chino tradicional de Taiwán

**Idiomas / Languages:** [繁體中文](README.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

Herramienta de localización **de código abierto, centrada en la privacidad y controlada por el usuario**. No es un nuevo modelo de lenguaje ni una lista de palabras obligatorias: permite elegir términos, conservar el original, revisar las diferencias y proteger la estructura técnica. Núcleo propio con licencia MIT; Founder / Steward: **CA L.**

## Demo destacada: PokéBonk en chino tradicional de Taiwán (R7.2 / v0.1.2)

**[README específico de PokéBonk: instalación y límites](examples/pokebonk-demo/README.md)** · [Descargar la demo independiente](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r7-pokebonk-demo-0.1.2)

Esta demo **no oficial** para Chrome y Tampermonkey (archivo único) modifica solo algunas etiquetas DOM visibles tras la activación manual. Incluye **171 ejemplos originales**, con **35 nuevas propuestas de interfaz/multijugador sin verificar en el juego real**. Excluye nombres de jugadores, chats y campos editables; admite restauración conservadora. **No altera las partidas, los guardados ni el tráfico de red y no se ha validado de extremo a extremo en la versión actual del juego.** No es una traducción completa ni oficial.

## Funciones disponibles

| Componente | Estado | Uso y límites |
| --- | --- | --- |
| **Demo PokéBonk** | **R7.2 v0.1.2 Preview** | Opcional, no oficial y solo texto DOM visible; [README propio](examples/pokebonk-demo/README.md) |
| **Lector bilingüe Chrome/Tampermonkey** | **R13 v0.6.0 Preview** | Selección y comparación original/traducción; API local de Chrome solo si está disponible, sin reescribir la página |
| **Glosario por sitio** | **R11 v0.5.0 Preview** | Importar glosario R9, previsualizar coincidencias, aprobarlas manualmente y revertir |
| Herramienta anterior | R5 v0.4.0 Preview | Corrección prudente sin conexión y traducción local experimental; se conserva para volver atrás |
| **Auditoría de calidad** | **R12 HTML independiente** | Cobertura y alertas estructurales del conjunto público R6 de 100 casos; **no certifica la calidad de traducción** |
| Revisión de términos y contexto | R8 / R9 / R10 HTML | Preferencias y ejemplos contextuales; las propuestas no revisadas no se aplican automáticamente |
| Capacidades/consentimiento de proveedores | **R14 Offline Shadow Preview** | Revisar idiomas declarados, disponibilidad, descargas y consentimiento, **sin enviar texto** |
| CLI / AI Skill | Prototype | Procesamiento prudente de Markdown, TXT y algunos JSON/JSONL; integración auxiliar con Codex / Claude |

La [demo R14](examples/TW_Provider_Capability_Lab_R14_20261025.html) **no mide la capacidad real de un dispositivo**. El lector R13 solo utiliza la API local de Chrome cuando está disponible o permite pegar una traducción; no recurre en secreto a servicios remotos.

**Descargas:** [PokéBonk R7.2](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r7-pokebonk-demo-0.1.2) · [R13](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r13-bilingual-reader-preview-0.6.0) · [R11](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r11-manual-site-glossary-0.5.0) · [R12](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r12-quality-evidence-preview-v1) · [Todas las versiones](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases)

Para Chrome, descomprime el ZIP y carga la carpeta que contiene `manifest.json` desde `chrome://extensions` (modo desarrollador); **no está en Chrome Web Store**. Tampermonkey usa un único archivo `.user.js`. Evita ejecutar R5 y R11 simultáneamente en el mismo sitio. [Instalación de Chrome](docs/INSTALL_CHROME.md) · [Instalación de Tampermonkey](docs/INSTALL_TAMPERMONKEY.md) · [Detalles R13](docs/R13_BILINGUAL_READER.md)

## Particularidades del proyecto

- **Control independiente del modelo:** gestión de términos, permisos, estructura protegida y diferencias; no afirmamos entrenar nuestro propio gran modelo.
- **Primero conservar:** protege código, nombres propios, claves JSON, URL y variables; ante ambigüedades, mantiene el original.
- **Preferencias taiwanesas según contexto:** `menu` de software puede ser 「選單」 y el de restaurante 「菜單」; para el `click` de interfaz con ratón se prefiere 「點選」, sin reemplazos globales fuera de contexto.
- **Calidad con límites explícitos:** los 100 casos R6 ya públicos sirven para regresión, **no** demuestran naturalidad certificada por revisores humanos independientes.

Describimos nuestras propias funciones; **no clasificamos ni acusamos a otros proyectos ni insinuamos asociaciones oficiales**.

## Privacidad, licencias y límites

El procesamiento es local por defecto, sin servidor propio que recopile textos de las páginas ni telemetría oculta. Las descargas de modelos de Chrome y las comunicaciones de las webs son independientes. El vocabulario público incluye **883 propuestas pendientes de revisión** y **67 ejemplos editoriales**; R10 contiene **40 ejemplos sin revisión independiente**. Ninguna propuesta pasa automáticamente a regla aprobada. [Privacidad](PRIVACY.md) · [Seguridad](SECURITY.md) · [Funcionalidades y límites](docs/FEATURES.md)

No se garantiza compatibilidad completa con Canvas/WebGL, OCR, todos los PDF, extensiones móviles ni una traducción natural verificada. Proyecto independiente sin respaldo implícito de terceros. Futuras extensiones comerciales no pueden retirar retroactivamente los derechos sobre el núcleo MIT ya publicado.

## Desarrollo y colaboración

Comparte solamente ejemplos legales, públicos y sin datos personales en [Issues](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/issues). [Contribuir](CONTRIBUTING.md) · [Plan de trabajo](docs/ROADMAP.md) · [Guía técnica](docs/DEVELOPER_GUIDE.md) · [Integración de IA](docs/AI_INTEGRATION.md) · [Cambios principales](CHANGELOG.md). El historial Git y las versiones anteriores permanecen disponibles.
