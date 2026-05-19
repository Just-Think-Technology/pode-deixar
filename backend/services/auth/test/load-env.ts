import * as dotenv from 'dotenv'
import * as path from 'path'

const envPath = path.resolve(__dirname, '../.env.test')
console.log('__dirname:', __dirname)
console.log('envPath:', envPath)

dotenv.config({ 
  path: envPath,
  override: true
})
console.log('JWT:', process.env.JWT_ACCESS_SECRET)