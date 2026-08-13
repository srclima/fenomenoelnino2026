import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function prerender() {
  // 1. Iniciar servidor temporal de Vite solo para cargar y compilar App.tsx a HTML en memoria
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });

  try {
    // 2. Renderizar React a String
    const { renderToString } = await import('react-dom/server');
    const React = await import('react');
    const AppModule = await vite.ssrLoadModule('/src/App.tsx');
    const App = AppModule.default;
    const appHtml = renderToString(React.createElement(App));

    // Cerrar el servidor de Vite
    await vite.close();

    // 3. Leer el index.html YA COMPILADO por Vite en la carpeta dist/
    const distHtmlPath = path.resolve(__dirname, 'dist/index.html');
    let html = fs.readFileSync(distHtmlPath, 'utf-8');

    // 4. Inyectar el HTML de React dentro de <div id="root"></div>
    html = html.replace(
      `<div id="root"></div>`,
      `<div id="root">${appHtml}</div>`
    );

    // 5. Reemplazar cualquier referencia a /src/main.tsx por el archivo JS bundle de producción en dist/assets/
    const distAssetsFiles = fs.readdirSync(path.resolve(__dirname, 'dist/assets'));
    const jsBundle = distAssetsFiles.find(file => file.endsWith('.js'));

    if (jsBundle) {
      // Reemplaza el script de desarrollo por el paquete final compilado
      html = html.replace(
        /<script type="module" src="\/src\/main\.tsx"><\/script>/g,
        `<script type="module" src="/assets/${jsBundle}"></script>`
      );
    }

    // 6. Sobrescribir dist/index.html con la versión final totalmente planchada
    fs.writeFileSync(distHtmlPath, html);
    console.log('✅ HTML planchado generado con éxito en dist/index.html apuntando a assets/');

  } catch (e) {
    console.error('Error durante el pre-renderizado:', e);
  }
}

prerender();