import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ 
  path: path.resolve(__dirname, '../.env.test'),
  override: true
})

console.log('JWT:', process.env.JWT_ACCESS_SECRET)