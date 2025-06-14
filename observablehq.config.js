

// See https://observablehq.com/framework/config for documentation.
export default {
  // The app’s title; used in the sidebar and webpage titles.
  title: "Explorador de Indicadores de Empleo en Chile",

  // The pages and sections in the sidebar. If you don’t specify this option,
  // all pages will be listed in alphabetical order. Listing pages explicitly
  // lets you organize them into sections and have unlisted pages.
  // pages: [
  //   {
  //     name: "Examples",
  //     pages: [
  //       {name: "Dashboard", path: "/example-dashboard"},
  //       {name: "Report", path: "/example-report"}
  //     ]
  //   }
  // ],

  // Content to add to the head of the page, e.g. for a favicon:
  head: '<link rel="icon" href="favicon.ico" type="image/png" sizes="32x32">',

  // The path to the source root.
  root: "src",

  // Some additional configuration options and their defaults:
  theme: "default", // try "light", "dark", "slate", etc.
  header: 'Un relato con datos <img src="./favicon.ico" height="20px"> <a href="https://www.relatoscondatos.cl" target="_blank">www.relatoscondatos.cl</a> ', // what to show in the header (HTML)
  footer: 'Relatos con datos <i class="fas fa-envelope"></i> <a href="mailto:contacto@relatoscondatos.cl">contacto@relatoscondatos.cl</a>', // what to show in the footer (HTML)
  sidebar: false, // whether to show the sidebar
  toc: {show:false, label:"Contenido"}, // whether to show the table of contents
  pager: false, // whether to show previous & next links in the footer
  // output: "dist", // path to the output root for build
  // search: true, // activate search
  // linkify: true, // convert URLs in Markdown to links
  typographer: true, // smart quotes and other typographic improvements
  // cleanUrls: true, // drop .html from URLs
};
