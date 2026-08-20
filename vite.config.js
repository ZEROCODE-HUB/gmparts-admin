import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Reparte las dependencias pesadas en trozos propios. El bundle era un único archivo de
// 3,3 MB: hasta para ver la pantalla de acceso había que descargarse Firebase entero y los
// generadores de PDF y Excel. Separarlos deja que el navegador los cachee aparte y no los
// vuelva a bajar en cada despliegue, porque cambian mucho menos que la aplicación.
//
// Vite 8 usa rolldown, cuyo manualChunks es una función (id) => nombre, no un objeto.
function repartirDependencias(id) {
  if (!id.includes('node_modules')) return
  if (id.includes('firebase') || id.includes('@firebase')) return 'firebase'
  if (id.includes('pdfmake')) return 'pdf'
  if (id.includes('xlsx')) return 'excel'
  if (id.includes('algoliasearch')) return 'algolia'
  if (id.includes('react-router')) return 'router'
  if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('scheduler')) return 'react'
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: { manualChunks: repartirDependencias },
    },
  },
})
