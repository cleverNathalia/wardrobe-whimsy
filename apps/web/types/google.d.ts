interface TokenResponse {
  access_token: string
  expires_in: number
  token_type: string
  scope: string
  error?: string
  error_description?: string
}

interface TokenClientConfig {
  client_id: string
  scope: string
  callback: (response: TokenResponse) => void
  error_callback?: (error: { type: string }) => void
}

interface TokenClient {
  requestAccessToken(opts?: { prompt?: string }): void
}

interface Window {
  google?: {
    accounts: {
      oauth2: {
        initTokenClient(config: TokenClientConfig): TokenClient
      }
    }
  }
}
