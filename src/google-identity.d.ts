interface GoogleCredentialResponse {
  credential: string
}

interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: { client_id: string; callback: (response: GoogleCredentialResponse) => void; use_fedcm_for_prompt?: boolean }) => void
        renderButton: (element: HTMLElement, config: Record<string, string | number>) => void
        disableAutoSelect: () => void
      }
    }
  }
}
