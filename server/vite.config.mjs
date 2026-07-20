import { defineConfig } from 'vite'
import jsonServer from 'vite-plugin-simple-json-server'

const allowAppOrigin = {
  name: 'allow-app-origin',
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      response.setHeader('Access-Control-Allow-Origin', 'http://localhost:8080')
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')

      if (request.method === 'OPTIONS') {
        response.statusCode = 204
        response.end()
        return
      }

      next()
    })
  },
}

export default defineConfig({
  plugins: [
    allowAppOrigin,
    jsonServer({
      mockDir: 'data',
      urlPrefixes: ['/'],
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
