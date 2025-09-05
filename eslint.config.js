// eslint.config.mjs
import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  react: true,
  ignores: [
    'src-tauri/target/debug/**',
    'src-tauri/target/release/**',
  ],
  rules: {
    'react-dom/no-missing-button-type': 'off',
    'react-hooks-extra/no-direct-set-state-in-use-effect': 'off',
    'react-hooks/exhaustive-deps': 'off',
  },
})
