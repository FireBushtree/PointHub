// eslint.config.mjs
import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  react: true,
  ignores: [
    'src-tauri/target/debug/**',
  ],
})
