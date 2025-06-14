---
toc: false

sql:
  dataFuente: https://raw.githubusercontent.com/elaval/datos-empleo-chile/refs/heads/main/data/processed/agregados/integrado/ene_trimestre_totales_simplificados.csv
---

```js
const descripciones = FileAttachment("./data/descripciones.json").json()
```





```js
const variables = _.chain([...data])
    .map()
    .first()
    .keys()
    .filter((d) => !d.match(/Año|Mes/))
    .value();

const selectMetric = view(Inputs.select(variables, {label: "Indicador"}));
```

```js
const diccionarioPorEtiqueta = (() => {
  const dict = {};
  _.chain(descripciones)
    .each((item, key) => (dict[item.label] = item))
    .value();

  return dict;
})()
```

```js
const datosVariable = diccionarioPorEtiqueta[selectMetric]
```
# ${selectMetric}
${datosVariable.description}  
*Nota*: ${datosVariable.notes}  
*Fuente descripción*: ${datosVariable.source}

```js
function incrementoAnual(mes, variable) {
  //return 456
  const dataFoco = [...data]
    .filter((d) => d["Mes central"] == mes)
    .map((d) => ({
      año: d["Año-Trimestre"],
      valor: d[variable] || null,
      indicador: variable
    }));

  const dict = {};
  dataFoco.forEach((d) => {
    d.diff = (dict[d.año - 1] && d.valor && d.valor - dict[d.año - 1]) || null;
    dict[d.año] = d.valor;
  });
  return dataFoco;
}
```

```js
const dataAnual = incrementoAnual(3, selectMetric)
//display(dataAnual)
```

```js
(() => {
  const dataPlot = _.chain(dataAnual)
    .filter((d) => d["valor"] !== null)
    .map((d) => [
      /*{
        date: moment(`${d.ano_trimestre}-${d.mes_central}`, `YYYY-M`).toDate(),
        value: +d["categoria_serv_domestico_puertas_adentro"],
        tipo: "categoria_serv_domestico_puertas_adentro"
      },
      {
        date: moment(`${d.ano_trimestre}-${d.mes_central}`, `YYYY-M`).toDate(),
        value: +d["categoria_serv_domestico_puertas_afuera"],
        tipo: "categoria_serv_domestico_puertas_afuera"
      },*/
      {
        date: moment(`${d["año"]}-${3}`, `YYYY-M`).toDate(),
        valor: +d["valor"],
        tipo: selectMetric
      }
    ])
    .flatten()
    .value();

  return Plot.plot({
    y: {
      grid: true
      //domain: [0, 11500000]
    },
    width,
    marginLeft: 100,
    title: "Cifras en Trimestre Febrero-Marzo-Abril de cada año",
    marks: [
      Plot.ruleX(
        [2010, 2014, 2018, 2022].map((año) =>
          moment.utc(`03-${año}`, "MM-YYYY").toDate()
        )
      ),
      Plot.text(
        [
          { label: "Piñera I", date: new Date("2012-03-01") },
          { label: "Bachelet II", date: new Date("2016-03-01") },
          { label: "Piñera II", date: new Date("2020-03-01") },
          { label: "Boric", date: new Date("2023-09-01") }
        ],
        {
          x: "date",
          y: 0,
          dy: -20,
          text: "label",
          fill: "grey",
          fontSize: 20
        }
      ),

      Plot.ruleY([0]),
      Plot.lineY(dataPlot, {
        x: "date",
        y: "valor",
        stroke: "tipo",
        tip: true
      }),
      Plot.dot(dataPlot, { x: "date", y: "valor", fill: "tipo" }),
      Plot.text(dataPlot, {
        x: "date",
        y: "valor",
        dy: -10,
        text: (d) => d3.format(".3s")(d["valor"])
      })
    ]
  });
})()
```

```js
(() => {
  return Plot.plot({
  //title: `${selectMetric}`,
  title: `Aumento / disminución desde inicio de gobierno`,
  y: { tickFormat: ",d" },
  x: { tickFormat: (d) => (d == "Boric" ? "Boric (primeros 3 años)" : d) },
  width,
  marks: [
    Plot.barY(dataGobiernos, {
      marginLeft: 100,
      marginRight: 50,
      y: (d) => d.diferencia,
      x: "gobierno",
      channels: { añoInicio: "añoInicio", order: "order" },
      sort: { x: "order", reverse: false },
      fill: (d) => (d) => d["gobierno"]
    }),
    Plot.text(dataGobiernos, {
      marginLeft: 100,
      y: (d) => d.diferencia,
      x: "gobierno",
      channels: { añoInicio: "añoInicio" },
      fill: (d) => "gobiernos",
      text: (d) => d3.format(".3s")(d.diferencia),
      dy: -10
    })
  ]
})
})()
```

```js
const dataGobiernos = diferenciasPorGobierno(selectMetric)
```

```js
const gobiernos = [
  {
    gobierno: "Piñera I",
    inicio: "2010-3",
    fin: "2014-3"
  },
  {
    gobierno: "Bachelet II",
    inicio: "2014-3",
    fin: "2018-3"
  },
  {
    gobierno: "Piñera II",
    inicio: "2018-3",
    fin: "2022-3"
  },

  {
    gobierno: "Boric",
    inicio: "2022-3",
    fin: "2026-3"
  }
]
```

```js

function diferenciasPorGobierno(variable) {
  return gobiernos.map((g, i) => {
    // Parseo fechas de gobierno
    const [anioInicioGob, mesInicioGob] = g.inicio.split("-").map(Number);
    const [anioFinGob, mesFinGob] = g.fin.split("-").map(Number);

    // Filtrar todos los datos dentro del rango oficial del gobierno
    const datosPeriodo = [...data].filter((d) => {
      const key = d["Año-Trimestre"] * 100 + d["Mes central"];
      const keyInicio = anioInicioGob * 100 + mesInicioGob;
      const keyFin = anioFinGob * 100 + mesFinGob;
      return key >= keyInicio && key <= keyFin;
    });

    // Buscar primer y último registro dentro del periodo con valor no nulo
    const primerConDatos = datosPeriodo.find((d) => d[variable] != null);
    const ultimoConDatos = datosPeriodo
      .slice()
      .reverse()
      .find((d) => d[variable] != null);

    // Si no hay datos en todo el periodo, devolvemos null o lo que prefieras
    if (!primerConDatos || !ultimoConDatos) {
      return {
        order: i,
        gobierno: g.gobierno,
        error: `No hay datos de "${variable}" en todo el periodo`
      };
    }

    // Índices para contar meses entre ambos
    const idxInicio = datosPeriodo.indexOf(primerConDatos);
    const idxFin = datosPeriodo.indexOf(ultimoConDatos);

    const valorInicial = primerConDatos[variable];
    const valorFinal = ultimoConDatos[variable];

    // Construir el objeto resultado
    return {
      order: i,
      gobierno: g.gobierno,
      añoInicioMedición: primerConDatos["Año-Trimestre"],
      inicio: primerConDatos,
      fin: ultimoConDatos,
      valorInicial,
      valorFinal,
      datos: datosPeriodo.slice(idxInicio, idxFin + 1),
      numeroMeses: idxFin - idxInicio,
      diferencia: valorFinal - valorInicial,
      promedioAnualDiferencia:
        (12 * (valorFinal - valorInicial)) / (idxFin - idxInicio),
      promedioAnualDiferencia_pct:
        (12 * (valorFinal - valorInicial)) / (idxFin - idxInicio) / valorInicial
    };
  });
}

```

# Datos utilizados en esta página
Nota: Estos datos fueron generados en base a datos fuentes publicados por el Instituto Nacional de Estadística en las base de datos públicas para Ocupación y Desocupación, con datos de la Encuesta Nacional de Empleo (https://www.ine.gob.cl/estadisticas/sociales/mercado-laboral/ocupacion-y-desocupacion).

El procesamiento de los datos sigue las orientaciones entregadas por el INE en sus documentos oficiales pero pueden haber errores de procesamiento que son responsabilidad del autor de la página y no son atribuibles al INE.

Se pueden descargar los datos procesados en el siguiente enlace: [ene_trimestre_totales_simplificados.csv](https://github.com/elaval/datos-empleo-chile/blob/main/data/processed/agregados/integrado/ene_trimestre_totales_simplificados.csv)

```sql display id=data
SELECT *
FROM dataFuente
```


```js
import moment from 'npm:moment'
```