// file: ./data/descripciones.json.js
const response = await fetch(
  "https://raw.githubusercontent.com/elaval/datos-empleo-chile/refs/heads/main/docs/variables.json"
);
if (!response.ok) throw new Error(`fetch failed: ${response.status}`);
const data = await response.json();

// Convert the object into a JSON string so that the bundler
// can save it as descripciones.json
process.stdout.write(JSON.stringify(data));
