import dotenv from 'dotenv'
import path from 'path'
import { google } from 'googleapis'
import { prisma } from '../lib/prisma'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const TEST_FOLDER_ID = '10CkIpQMQpEMg7J6B3iIrdCtXtHC3vKWd'
const TEST_USER_ID = 'test-user-' + Date.now()

async function testServiceAccount() {
  console.log('\n📁 Testing Service Account Connection...')

  try {
    const credsJson = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS
    if (!credsJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS not set in .env.local')
    }

    const credentials = JSON.parse(credsJson)
    console.log('✅ Service account credentials loaded')

    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/drive'],
    })

    const drive = google.drive({ version: 'v3', auth })
    console.log('✅ Google Drive client created')

    // Try to list files in the test folder
    const res = await drive.files.list({
      q: `'${TEST_FOLDER_ID}' in parents and trashed=false`,
      spaces: 'drive',
      fields: 'files(id, name)',
      pageSize: 5,
    })

    console.log('✅ Successfully accessed Google Drive folder')
    console.log(`   Files in folder: ${res.data.files?.length ?? 0}`)

    if (res.data.files && res.data.files.length > 0) {
      console.log('   Sample files:')
      res.data.files.forEach((file) => {
        console.log(`     - ${file.name}`)
      })
    }

    return true
  } catch (error) {
    console.error('❌ Service Account test failed:')
    console.error(error instanceof Error ? error.message : error)
    return false
  }
}

async function testDatabase() {
  console.log('\n💾 Testing Database Connection...')

  try {
    // Create a test user
    console.log(`Creating test user: ${TEST_USER_ID}`)
    const user = await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        email: `${TEST_USER_ID}@test.local`,
      },
    })
    console.log('✅ User created in database')

    // Create a test wardrobe
    console.log('Creating test wardrobe...')
    const wardrobe = await prisma.wardrobe.create({
      data: {
        userId: user.id,
        name: 'Test Wardrobe',
        googleFolderId: TEST_FOLDER_ID,
        isDefault: true,
      },
    })
    console.log('✅ Wardrobe created in database')
    console.log(`   Wardrobe ID: ${wardrobe.id}`)

    // Read it back
    console.log('Reading wardrobe from database...')
    const readWardrobe = await prisma.wardrobe.findUnique({
      where: { id: wardrobe.id },
    })

    if (!readWardrobe) {
      throw new Error('Could not read wardrobe back from database')
    }

    console.log('✅ Successfully read wardrobe from database')
    console.log(`   Name: ${readWardrobe.name}`)
    console.log(`   Folder ID: ${readWardrobe.googleFolderId}`)

    // Clean up
    console.log('Cleaning up test data...')
    await prisma.wardrobe.delete({ where: { id: wardrobe.id } })
    await prisma.user.delete({ where: { id: user.id } })
    console.log('✅ Test data cleaned up')

    return true
  } catch (error) {
    console.error('❌ Database test failed:')
    console.error(error instanceof Error ? error.message : error)
    return false
  }
}

async function main() {
  console.log('🧪 Running setup tests...')

  const serviceAccountOk = await testServiceAccount()
  const databaseOk = await testDatabase()

  console.log('\n📊 Test Results:')
  console.log(`  Service Account: ${serviceAccountOk ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`  Database: ${databaseOk ? '✅ PASS' : '❌ FAIL'}`)

  if (serviceAccountOk && databaseOk) {
    console.log('\n✅ All tests passed! Ready to proceed with Phase 4.')
  } else {
    console.log('\n❌ Some tests failed. Check the errors above.')
    process.exit(1)
  }

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
