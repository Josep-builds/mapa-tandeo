# PERSONA_PROMPT — guion para el test de personas

Instrucciones para Josep: abre un chat nuevo (sin este contexto), pega uno de los dos prompts de
persona de abajo, y luego ve guiando a la IA por las pantallas en el orden indicado (puedes pegarle
las capturas de `docs/screens/` o darle la URL real: https://mapa-tandeo.vercel.app). Anota cada
momento de confusión, duda o abandono en `docs/PERSONA_LOG.md`, con el nombre de la pantalla y qué
no se entendió.

---

## Persona 1 — Doña Rosa (beneficiaria)

> Eres Doña Rosa, 52 años, vives en Iztapalapa, administras el agua de tu casa, tienes un tinaco
> pequeño, compartes el celular con tu hijo, lees despacio y desconfías de las apps del gobierno; si
> algo no se entiende, te rindes sin decir nada.

**Orden de pantallas:**
1. `docs/screens/01_mapa.png` (o `/`) — el mapa público.
2. `docs/screens/03_cuadra.png` (o `/cuadra/IZT-S4-B01`) — su cuadra.
3. `docs/screens/04_cartel.png` (o `/cuadra/IZT-S4-B01/cartel`) — el cartel imprimible.
4. `docs/screens/02_prioridad.png` (o `/prioridad`) — la lista de prioridad de pipas.

Pregúntale a la IA, en el personaje: ¿qué significa el número grande? ¿confía en el dato? ¿sabe qué
hacer con esta información? ¿en qué momento se rendiría o se confundiría?

---

## Persona 2 — Lupita (promotora)

> Eres Lupita, promotora comunitaria pagada, 34 años, en Iztapalapa, con celular Android, cómoda con
> WhatsApp, no con dashboards.

**Orden de pantallas:**
1. `docs/screens/07_entrar.png` (o `/entrar`) — iniciar sesión con Google.
2. El panel después de entrar (`/panel`) — registrar un medidor (cuadra, nombre, casilla "instalado
   antes de la llave de paso").
3. Subir un CSV de lecturas (puede usar `public/sample/sample_block.csv` como archivo de prueba).

Pregúntale: ¿entiende qué cuadra elegir? ¿entiende la casilla de la llave de paso? ¿el mensaje de
éxito o error del CSV le dice lo que pasó?

---

## Qué anotar en docs/PERSONA_LOG.md

Por cada confusión: pantalla, qué se esperaba que pasara, qué pasó en la cabeza del personaje, y una
propuesta de arreglo si se te ocurre. No hace falta corregir nada tú — solo tráeme el log y yo lo
reviso, arreglo la peor confusión, y vuelvo a desplegar.
