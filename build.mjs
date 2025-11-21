import * as esbuild from 'esbuild'
import { watch } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Custom plugin to output sw.js to root
const swRootPlugin = {
  name: 'sw-root',
  setup(build) {
    build.onEnd(async (result) => {
      const swPath = path.join(__dirname, 'dist', 'layx','others','pwa','sw', 'sw.bundle.js')
      const rootPath = path.join(__dirname, 'sw.bundle.js')
      
      // Check if sw.bundle.js exists and copy to root
      if (fs.existsSync(swPath)) {
        fs.copyFileSync(swPath, rootPath)
        console.log('📍 Service Worker copied to dist/sw.js')
      }
    })
  }
}

// Build configuration
const buildConfig = {
  // Entry points for bundling
  entryPoints: [
    'assets/js/chat_app/main.js',
    'layx/layx.js',
    'layx/layx.css',
    'assets/css/chat_app/main.css',
    'layx/others/pwa/sw/sw.js'
  ],
  
  // Output configuration
  bundle: true,
  outdir: 'dist',
  outExtension: { '.js': '.bundle.js', '.css': '.bundle.css' },
  assetNames: '[path]/[name]',
  
  // Format and target
  format: 'esm',
  target: ['chrome139'],
  
  // Optimization - minify by default
  minify: !process.argv.includes('--dev'),
  sourcemap: process.argv.includes('--dev'),
  
  // Module resolution
  platform: 'browser',
  loader: {
    '.woff2': 'file',
    '.svg': 'file',
  },
  
  // Disable code splitting to include all chunks in main bundle
  splitting: false,
  
  // Other options
  logLevel: 'info',
  plugins: [swRootPlugin],
}

// Check if watch mode or dev mode is enabled
const isWatchMode = process.argv.includes('--watch')
const isDevMode = process.argv.includes('--dev')

async function build() {
  try {
    const modeLabel = isDevMode ? 'Development' : 'Production'
    const minifyLabel = buildConfig.minify ? '(minified)' : '(with source maps)'
    
    if (isWatchMode) {
      console.log(`🔍 Watch mode enabled (${modeLabel} ${minifyLabel})...`)
      
      const ctx = await esbuild.context(buildConfig)
      
      await ctx.watch()
      console.log('✅ Watching for changes...')
      
      // Keep the process alive
      process.on('SIGINT', async () => {
        console.log('\n🛑 Stopping watcher...')
        await ctx.dispose()
        process.exit(0)
      })
    } else {
      console.log(`🔨 Building (${modeLabel} ${minifyLabel})...`)
      const result = await esbuild.build(buildConfig)
      
      // Print build stats
      if (result.metafile) {
        const outputs = result.metafile.outputs
        console.log('\n📦 Build outputs:')
        Object.entries(outputs).forEach(([file, data]) => {
          const size = (data.bytes / 1024).toFixed(2)
          console.log(`  ${file} - ${size} KB`)
        })
      }
      
      console.log(`✅ Build completed successfully! (${modeLabel})`)
    }
  } catch (error) {
    console.error('❌ Build failed:', error.message)
    process.exit(1)
  }
}

// Run the build
build()