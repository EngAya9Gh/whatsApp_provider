import { build } from 'vite'
build().catch(err => {
  console.error("BUILD ERROR:", err)
  process.exit(1)
})
