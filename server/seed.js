// Creates the first dashboard admin (from ADMIN_EMAIL / ADMIN_PASSWORD in .env)
// and stores the default content if the database has none yet.
// Run with: npm run db:seed
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import defaultContent from '../src/content.js'

const prisma = new PrismaClient()
const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
const password = process.env.ADMIN_PASSWORD || ''

if (!email || password.length < 6) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (6+ chars) in .env first.')
  process.exit(1)
}

const existing = await prisma.admin.findUnique({ where: { email } })
if (existing) {
  console.log(`Admin ${email} already exists (password unchanged).`)
} else {
  await prisma.admin.create({ data: { email, passwordHash: await bcrypt.hash(password, 12) } })
  console.log(`Created admin ${email}.`)
}

const content = await prisma.content.findUnique({ where: { key: 'site' } })
if (!content) {
  await prisma.content.create({ data: { key: 'site', data: defaultContent } })
  console.log('Stored default site content.')
}

await prisma.$disconnect()
