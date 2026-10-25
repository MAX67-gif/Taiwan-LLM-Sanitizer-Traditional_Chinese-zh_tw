<!-- HUMAN_TRANSLATION_REVIEW: pending independent native-speaker review -->
<!-- SOURCE_EXAMPLES_SHA256:dc1676ca551c97b1480836009e2b7115a60f84776ed4980b660540e396aad5e3 -->

# Nueve ejemplos originales de localización al chino tradicional de Taiwán

**Idiomas:** [繁體中文](USAGE_EXAMPLES.md) · [简体中文](USAGE_EXAMPLES.zh-CN.md) · [English](USAGE_EXAMPLES.en.md) · [日本語](USAGE_EXAMPLES.ja.md) · [한국어](USAGE_EXAMPLES.ko.md) · [Español](USAGE_EXAMPLES.es.md)

> Todos los textos son ejemplos ficticios originales, no copias ni capturas de juegos o sitios reales. No hay aprobación oficial ni compatibilidad verificada. Las traducciones son propuestas editoriales, **no resultados automáticos**. Las herramientas aún funcionan por separado.

## EX01｜El contexto cambia la palabra correcta

En software, `menu` puede expresarse en chino de Taiwán como «選單»; en un restaurante, «菜單». El `click` de una interfaz puede ser «點選», pero un ruido de cámara necesita otra traducción. R11 permite elegir términos, no decidir automáticamente todos los contextos.

## EX02｜R13: lectura bilingüe de una selección

En una página HTML ficticia se selecciona `Open settings to adjust the display.`. R13 puede presentar el original junto a una traducción escrita manualmente, como `開啟設定以調整顯示方式。`. Solo utilizará un modelo local cuando esté realmente disponible. No modifica la página original ni traduce todo el sitio automáticamente.

## EX03｜R11: glosario personal por sitio

El usuario prepara `Settings → 設定` y `Open menu → 開啟選單`, revisa y aprueba el resultado para un sitio elegido que lo permita. La restauración es conservadora y condicional; no es un traductor semántico universal.

## EX04｜R14: si no hay modelo, no hay transferencia oculta

Si el par hipotético `en → zh-Hant` devuelve `unavailable`, se indica ese estado. No se envía el texto a un proveedor remoto sin autorización. Los datos de demostración de R14 no verifican un dispositivo real.

## EX05｜R15: conservar la sintaxis Markdown

En la frase original `Run the tool with` + `--help` + `See https://example.org/help.`, una persona puede proponer cambios al texto descriptivo, conservando código, opciones y URL. R15 no es un parser AST completo. No se anuncia R15.1 como disponible sin comprobar su publicación.

## EX06｜R15: traducir un valor JSON, no la estructura

```json
{"title":"Help center","url":"https://example.org/help","enabled":true}
```

Se puede previsualizar que el valor de `title` pase a `說明中心`, pero no cambiar claves, URL ni valores booleanos. No se sobrescribe el archivo original.

## EX07｜R15: roles y variables de un Prompt

```text
system: Preserve placeholders exactly.
user: Explain the settings for {{ACCOUNT_ID}}.
```

Las etiquetas de rol y `{{ACCOUNT_ID}}` quedan protegidas; la vista previa no certifica que el Prompt conserve todos sus significados.

## EX08｜Interfaz hipotética parecida a un juego web

Textos DOM ordinarios como `Open settings` y `Start` podrían revisarse con la selección manual de R13 o un glosario creado por el usuario en R11, **solo si los términos del sitio lo permiten**. Quedan fuera los textos dibujados en Canvas/WebGL, nombres de jugadores, chat, credenciales y partidas guardadas. No se distribuyen scripts, diccionarios ni parches específicos de juegos; no se afirma compatibilidad con juegos reales.

## EX09｜Detenerse ante riesgos o derechos no claros

No extraer textos de imágenes, diálogos protegidos de terceros ni mensajes privados. Cuando la plataforma prohíbe cambios, preservar el original y usar ejemplos propios sin conexión.

## Enlaces útiles

[Guía general de sitios web](WEBSITE_LOCALIZATION_GUIDE.md) · [Derechos y privacidad](THIRD_PARTY_RIGHTS_POLICY.md) · [Límites de R15](R15_STRUCTURED_INTEGRITY.md). No se inventan cifras de precisión o adopción.

## Práctica R16 con ejemplos originales

Abra el [estudio R16 sin conexión](../examples/TW_Localization_Safety_Studio_R16_20261026.html) y el [ejemplo de Markdown original](../examples/r16/sample_readme.md). Revise los segmentos protegidos antes de escribir propuestas manuales; código, variables, comentarios HTML y URL no se alteran. Se descarga una vista previa nueva sin sobrescribir el original. **Sin traducción automática ni subida de datos**.
