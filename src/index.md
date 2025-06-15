---
toc: false

sql:
  dataFuente: https://raw.githubusercontent.com/elaval/datos-empleo-chile/refs/heads/main/data/processed/agregados/integrado/ene_trimestre_totales_simplificados.csv
---


# Explorador de Indicadores de Empleo en Chile

Esta página permite seleccionar un indicador (por ejemplo, “Ocupados formales”), ver su descripción y calcular:
- La variación año contra año para un trimestre específico.
- El cambio acumulado en cada período de gobierno (Piñera I, Bachelet II, etc.).

Los datos provienen del INE (Encuesta Nacional de Empleo) y se obtienen de un CSV preprocesado.  


```js
// **1. Carga del archivo JSON con descripciones de variables**
//
// Este archivo lo generamos mediante un loader (`./data/descripciones.json.js`)
// que hace fetch a GitHub y escribe el JSON completo.
// Asegúrate de que en tu loader hayas hecho:
//    process.stdout.write(JSON.stringify(data))
// para que genere correctamente `descripciones.json`.
const descripciones = await FileAttachment("./data/descripciones.json").json();
```


```js
// **2. Construcción de la lista de variables**
//
// Con lodash obtenemos las llaves del primer registro y quitamos
// aquellas que contienen “Año” o “Mes” para quedarnos solo con nuestras métricas.
const variables = _.chain([...data])
  .first()          // Tomamos el primer objeto (registro) de `data`.
  .keys()           // Obtenemos todas sus llaves.
  .filter(d => !d.match(/Año|Mes/)) // Excluimos “Año-Trimestre” y “Mes central”.
  .value();

```


```js
// **3. Construcción de un diccionario “label → objeto de descripción”**
//
// Las descripciones JSON vienen en formato { claveVariable: { label, description, notes, source } }.
// Queremos un diccionario que, a partir de la etiqueta (label), nos devuelva el objeto completo.
const diccionarioPorEtiqueta = (() => {
  const dict = {};
  // `descripciones` es un objeto: cada key es la clave interna y cada valor es { label, ... }.
  _.each(descripciones, (item) => {
    dict[item.label] = item;
  });
  return dict;
})();
```


```js
// **4. Objeto con la descripción para la etiqueta seleccionada**
//
// Cuando el usuario cambie `selectMetric`, esta constante se recalculará automáticamente.
const datosVariable = diccionarioPorEtiqueta[selectMetric];
```


## Descripción del Indicador

```js
// Creamos un selector para elegir la variable a graficar.
const selectMetric = view(Inputs.select(variables, {
  label: "Selecciona un indicador",
  value: variables[0]  // Por defecto, la primera variable de la lista.
}));
```

```js
// Buscar en el diccionario de excepciones
const metadatos = excepcionesFormato[selectMetric] || {
  unit: "personas",
  axisLabel: "Cantidad de personas",
  format: d3.format(".3s") // 3 digitos significativos
};
```

### ${selectMetric}
${datosVariable.description}

${datosVariable.notes
  ? md`> **Notas**: ${datosVariable.notes}`
  : ""}  
> **Fuente**: ${datosVariable.source}

```js
// **5. Función para calcular el incremento año a año en un mes dado**
//
// Parámetros:
//   - mes (número): mes central del trimestre que nos interesa (ej. 3 para Feb-Mar-Abr).
//   - variable (string): el nombre de la columna a analizar.
//
// La función devuelve un arreglo de objetos:
//   { año, valor, diff, indicador }
function incrementoAnual(mes, variable) {
  // Filtramos `data` para quedarnos solo con los registros cuyo “Mes central” sea igual a `mes`.
  const dataFoco = [...data]
    .filter(d => d["Mes central"] === mes)
    .map(d => ({
      año: d["Año-Trimestre"],
      valor: d[variable] != null ? +d[variable] : null,
      indicador: variable
    }));

  // Creamos un diccionario para comparar con el año anterior.
  const dictPorAño = {};
  dataFoco.forEach(d => {
    // Si existe un valor del año anterior, calculamos la diferencia.
    const valorAnterior = dictPorAño[d.año - 1];
    d.diff = (valorAnterior != null && d.valor != null) 
      ? d.valor - valorAnterior 
      : null;
    // Guardamos el valor de este año para usos futuros.
    dictPorAño[d.año] = d.valor;
  });

  return dataFoco;
}
```


```js
// **6. Computamos la variación anual para mes = 3 (Feb-Mar-Abr) y la variable seleccionada**
const dataAnual = incrementoAnual(3, selectMetric);
```


```js
// **7. Convertir `dataAnual` en datos para graficar (eje temporal continuo)**
const dataPlot = _.chain(dataAnual)
  .filter(d => d.valor != null)   // Eliminamos filas con valor = null
  .map(d => ({
    date: moment(`${d.año}-${3}`, "YYYY-M").toDate(), // Fecha al 1 de marzo de cada año
    valor: d.valor,
    diff: d.diff,
    tipo: selectMetric
  }))
  .value();
```


```js
// **8. Gráfico de línea con incremento año contra año**
Plot.plot({
  y: {
    grid: true,
    label: metadatos.axisLabel,      // Antes: "Cantidad (personas)"
    tickFormat: metadatos.format     // Formato dinámico según variable
  },
  x: {
    label: "Año",
    tickFormat: "%Y"
  },
  width: 800,
  height: 400,
  marginLeft:100,

  title: `Valor año a año para "${selectMetric}"`,
  subtitle: `Trimestre Febrero-Marzo-Abril del año respectivo`,
  marks: [
    // Líneas verticales para marcar cambios de gobierno (opcional)
    Plot.ruleX(
      [2010, 2014, 2018, 2022].map(año =>
        moment.utc(`03-${año}`, "MM-YYYY").toDate()
      ),
      { stroke: "#ccc", strokeWidth: 1, strokeDasharray: "4,4" }
    ),

    // Etiquetas en las líneas de gobierno
    Plot.text(
      [
        { label: "Piñera I", date: new Date("2012-03-01") },
        { label: "Bachelet II", date: new Date("2016-03-01") },
        { label: "Piñera II", date: new Date("2020-03-01") },
        { label: "Boric", date: new Date("2023-03-01") }
      ],
      {
        x: "date",
        y: 0,
        dy: -20,
        text: "label",
        fill: "grey",
        fontSize: 14
      }
    ),

    // Línea que muestra el valor de cada año
    Plot.lineY(dataPlot, {
      x: "date",
      y: "valor",
      stroke: "tipo",
      strokeWidth: 2,
      tip: true
    }),

    // Puntos en cada año
    Plot.dot(dataPlot, { x: "date", y: "valor", fill: "tipo", r: 4 }),

    // Etiquetas con el valor formateado
    Plot.text(dataPlot, {
      x: "date",
      y: "valor",
      dy: -10,
      text: d => d3.format(".3s")(d.valor)
    })
  ]
})
```


```js
// **9. Definición de los períodos de gobierno**
const gobiernos = [
  { gobierno: "Piñera I",   inicio: "2010-3", fin: "2014-3" },
  { gobierno: "Bachelet II", inicio: "2014-3", fin: "2018-3" },
  { gobierno: "Piñera II",  inicio: "2018-3", fin: "2022-3" },
  { gobierno: "Boric",      inicio: "2022-3", fin: "2026-3" }
];
```


```js
// **10. Función que devuelve, para cada gobierno, el cambio entre el primer mes con dato
//      y el último mes con dato dentro del rango oficial**
function diferenciasPorGobierno(variable) {
  return gobiernos.map((g, i) => {
    const [anioInicioGob, mesInicioGob] = g.inicio.split("-").map(Number);
    const [anioFinGob, mesFinGob] = g.fin.split("-").map(Number);

    const datosPeriodo = [...data].filter(d => {
      const key = d["Año-Trimestre"] * 100 + d["Mes central"];
      const keyInicio = anioInicioGob * 100 + mesInicioGob;
      const keyFin = anioFinGob * 100 + mesFinGob;
      return key >= keyInicio && key <= keyFin;
    });

    const primerConDatos = datosPeriodo.find(d => d[variable] != null);
    const ultimoConDatos = datosPeriodo.slice().reverse().find(d => d[variable] != null);

    // Verificamos que haya datos exactamente en el inicio y fin del período
    const inicioEsperado = datosPeriodo[0];
    const finEsperado = datosPeriodo[datosPeriodo.length - 1];

    const tieneDatoInicioExacto = inicioEsperado && inicioEsperado[variable] != null;
    const tieneDatoFinExacto = finEsperado && finEsperado[variable] != null;

    // Permitir excepción especial para Boric (fin de período incompleto)
    const esBoric = g.gobierno === "Boric";
    const permitirFinIncompleto = esBoric;

    // Si falta dato en el inicio o fin (según el caso), descartamos
    if (!tieneDatoInicioExacto || (!tieneDatoFinExacto && !permitirFinIncompleto)) {
      return {
        order: i,
        gobierno: g.gobierno,
        error: `Faltan datos al inicio o fin del período`
      };
    }

    const valorInicial = +inicioEsperado[variable];
    const valorFinal = +finEsperado[variable];

    const idxInicio = datosPeriodo.indexOf(inicioEsperado);
    const idxFin = datosPeriodo.indexOf(finEsperado);

    return {
      order: i,
      gobierno: g.gobierno,
      añoInicioMedición: inicioEsperado["Año-Trimestre"],
      valorInicial,
      valorFinal,
      datos: datosPeriodo.slice(idxInicio, idxFin + 1),
      numeroMeses: idxFin - idxInicio,
      diferencia: valorFinal - valorInicial,
      promedioAnualDiferencia:
        (12 * (valorFinal - valorInicial)) / (idxFin - idxInicio),
      promedioAnualDiferencia_pct:
        ((12 * (valorFinal - valorInicial)) / (idxFin - idxInicio)) / valorInicial
    };
  });
}

// **11. Ejecutamos la función con la variable seleccionada**
const dataGobiernos = diferenciasPorGobierno(selectMetric);
const gobiernosExcluidos = dataGobiernos.filter(d => d.error);
```


```js
// **12. Filtrar solo gobiernos sin error**
//
// En caso de que un período no tenga datos, podría aparecer { error: ... }.
// Acá filtramos solo los que tengan `diferencia` definida (sin error).
const dataGobFiltrada = dataGobiernos.filter(d => d.diferencia != null);
```


## Cambios en las cifras durante el respectivo período presidencial

```js
if (gobiernosExcluidos.length) {
   display(md`> ⚠️ **Algunos gobiernos no se muestran** porque no existen datos disponibles tanto al inicio como al final de su período presidencial para el indicador seleccionado.
> 
> **Períodos excluidos:**
>
> ${gobiernosExcluidos.map(d =>
    `- ${d.gobierno}: ${d.error}`
  ).join("  \n>")}
`)
} else {
   display(md``)
}
```





```js
// **13. Gráfico de barras: cambio total en cada gobierno**
Plot.plot({
  y: {
    grid: true,
    label: metadatos.axisLabel,      // Antes: "Cantidad (personas)"
    tickFormat: metadatos.formatChange || metadatos.format     // Formato dinámico según variable
  },
  x: {
    label: "Gobierno",
    tickRotate: 0,
    tickFormat: (d) => (d == "Boric" ? "Boric (primeros 3 años)" : d),
  },
  width: 700,
  height: 450,
  title: `${selectMetric}"`,
  marginLeft: 100,
  marginBottom: 80,
  marks: [
    // Barras verticales
    Plot.barY(dataGobFiltrada, {
      x: "gobierno",
      y: d => d.diferencia,
      channels: {  order: "order" },
      sort: { x: "order", reverse: false },
      fill: d => d.gobierno
    }),

    // Texto encima de cada barra
    Plot.text(dataGobFiltrada, {
      x: "gobierno",
      y: d => d.diferencia,
      text: d => metadatos.formatChange && metadatos.formatChange(d.diferencia) || metadatos.format(d.diferencia),
      dy: -10,
      fontSize: 12,
      fill: "#333"
    })
  ]
})
```


## Datos utilizados en esta página

Los datos brutos provienen de la Encuesta Nacional de Empleo (ENE) del INE.  
Este CSV ha sido preprocesado siguiendo las guías oficiales del INE, pero podrían existir errores de procesamiento que no son atribuibles al INE.

- **Archivo procesado completo**:  
  https://github.com/elaval/datos-empleo-chile/blob/main/data/processed/agregados/integrado/ene_trimestre_totales_simplificados.csv

```sql id=data display
SELECT *
FROM dataFuente
```

**Autor**: Ernesto Laval  
**Contacto**: para errores o sugerencias, envíame un DM en X (Twitter) a [@elaval](https://x.com/elaval)  
**Última actualización**: ${new Date().toLocaleDateString("es-CL")}  
**Licencia**: CC BY 4.0  
  
Siéntete libre de compartir este contenido y de enviarme feedback para mejorar la página.


```js
// Diccionario de formatos “especiales” para ciertas variables:
// - key: nombre exacto de la variable (la misma que aparece en `variables`).
// - Cada objeto incluye `unit` (texto), `axisLabel` y `format` (d3.format).
const excepcionesFormato = {
  // Ejemplo de variable “horas promedio trabajadas”
  "Prom. horas efectivas sin ausentes": {
    unit: "horas",
    axisLabel: "Horas promedio",
    // d3.format(".1f") → 1 decimal fijo
    format: d3.format(".1f")
  },
  "Prom. horas efectivas (declaran)": {
    unit: "horas",
    axisLabel: "Horas promedio",
    // d3.format(".1f") → 1 decimal fijo
    format: d3.format(".1f")
  },
  "Prom. horas habituales": {
    unit: "horas",
    axisLabel: "Horas promedio",
    // d3.format(".1f") → 1 decimal fijo
    format: d3.format(".1f")
  },


  // Ejemplo de variable en porcentaje (0 a 1)
  "Tasa de desocupación (%)": {
    unit: "porcentaje",
    axisLabel: "Tasa de desempleo (%)",
    // d3.format(".1%") → formatea 0.123 a “12.3%”
    format: d => d3.format(".2%")(d/100),
    formatChange: d => `${d3.format(".2f")(d)}pp`
  },
  "Tasa de ocupación (%)": {
    unit: "porcentaje",
    axisLabel: "Tasa de ocupación (%)",
    // d3.format(".1%") → formatea 0.123 a “12.3%”
    format: d => d3.format(".1%")(d/100),
    formatChange: d => `${d3.format(".1f")(d)}pp`
  },
  "Tasa de participación (%)": {
    unit: "porcentaje",
    axisLabel: "Tasa de participación (%)",
    // d3.format(".1%") → formatea 0.123 a “12.3%”
    format: d => d3.format(".1%")(d/100),
    formatChange: d => `${d3.format(".1f")(d)}pp`
  },
  "Tasa de presión laboral (%)": {
    unit: "porcentaje",
    axisLabel: "Tasa de presión laboral (%)",
    // d3.format(".1%") → formatea 0.123 a “12.3%”
    format: d => d3.format(".1%")(d/100),
    formatChange: d => `${d3.format(".1f")(d)}pp`
  },
  "Tasa SU1 (%)": {
    unit: "porcentaje",
    axisLabel: "Tasa SU1 (%)",
    // d3.format(".1%") → formatea 0.123 a “12.3%”
    format: d => d3.format(".1%")(d/100),
    formatChange: d => `${d3.format(".1f")(d)}pp`
  },
  "Tasa SU2 (%)": {
    unit: "porcentaje",
    axisLabel: "Tasa SU2 (%)",
    // d3.format(".1%") → formatea 0.123 a “12.3%”
    format: d => d3.format(".1%")(d/100),
    formatChange: d => `${d3.format(".1f")(d)}pp`
  },
  "Tasa SU3 (%)": {
    unit: "porcentaje",
    axisLabel: "Tasa SU3 (%)",
    // d3.format(".1%") → formatea 0.123 a “12.3%”
    format: d => d3.format(".1%")(d/100),
    formatChange: d => `${d3.format(".1f")(d)}pp`
  },
  "Tasa SU4 (%)": {
    unit: "porcentaje",
    axisLabel: "Tasa SU4 (%)",
    // d3.format(".1%") → formatea 0.123 a “12.3%”
    format: d => d3.format(".1%")(d/100),
    formatChange: d => `${d3.format(".1f")(d)}pp`
  },
  "Tasa de empleo informal (%)": {
    unit: "porcentaje",
    axisLabel: "Tasa de empleo informal (%)",
    // d3.format(".1%") → formatea 0.123 a “12.3%”
    format: d => d3.format(".1%")(d/100),
    formatChange: d => `${d3.format(".1f")(d)}pp`
  },  
  "Tasa de empleo en sector informal (%)": {
    unit: "porcentaje",
    axisLabel: "Tasa de empleo informal (%)",
    // d3.format(".1%") → formatea 0.123 a “12.3%”
    format: d => d3.format(".1%")(d/100),
    formatChange: d => `${d3.format(".1f")(d)}pp`
  },
  
};
```

```js
import markdownit from "npm:markdown-it";
```

```js
const Markdown = new markdownit({html: true});

function md(strings) {
  let string = strings[0];
  for (let i = 1; i < arguments.length; ++i) {
    string += String(arguments[i]);
    string += strings[i];
  }
  const template = document.createElement("template");
  template.innerHTML = Markdown.render(string);
  return template.content.cloneNode(true);
}
```

```js
// **14. Importar Moment.js para las fechas**
import moment from "npm:moment";
```


