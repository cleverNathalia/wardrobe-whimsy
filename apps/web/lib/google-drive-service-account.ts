import { google, type drive_v3 } from 'googleapis'

type GoogleAuthClient = InstanceType<typeof google.auth.JWT>

let cachedAuthClient: GoogleAuthClient | null = null

function getServiceAccountCredentials(): Record<string, string | object> {
  const credsJson = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS
  if (!credsJson) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_CREDENTIALS environment variable not set. ' +
        'Add your service account JSON to .env.local'
    )
  }

  try {
    return JSON.parse(credsJson) as Record<string, string | object>
  } catch {
    throw new Error(
      'Failed to parse GOOGLE_SERVICE_ACCOUNT_CREDENTIALS. ' +
        'Ensure it is valid JSON.'
    )
  }
}

export function getServiceAccountAuthClient(): GoogleAuthClient {
  if (cachedAuthClient) return cachedAuthClient

  const credentials = getServiceAccountCredentials()

  const auth = new google.auth.JWT({
    email: credentials.client_email as string,
    key: (credentials.private_key as string).replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/drive'],
  })

  cachedAuthClient = auth
  return auth
}

export function getServiceAccountDriveClient(): drive_v3.Drive {
  const auth = getServiceAccountAuthClient()
  return google.drive({ version: 'v3', auth })
}
