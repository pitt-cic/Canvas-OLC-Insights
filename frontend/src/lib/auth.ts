import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from 'amazon-cognito-identity-js'

const userPool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_USER_POOL_ID,
  ClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
})

export interface AuthResult {
  success: boolean
  newPasswordRequired?: boolean
  error?: string
}

let pendingUser: CognitoUser | null = null

export function signIn(email: string, password: string): Promise<AuthResult> {
  return new Promise((resolve) => {
    const user = new CognitoUser({ Username: email, Pool: userPool })
    user.setAuthenticationFlowType('USER_PASSWORD_AUTH')
    const details = new AuthenticationDetails({ Username: email, Password: password })

    user.authenticateUser(details, {
      onSuccess: () => {
        resolve({ success: true })
      },
      onFailure: (err) => {
        resolve({ success: false, error: err.message || 'Authentication failed' })
      },
      newPasswordRequired: () => {
        pendingUser = user
        resolve({ success: false, newPasswordRequired: true })
      },
    })
  })
}

export function completeNewPassword(newPassword: string): Promise<AuthResult> {
  return new Promise((resolve) => {
    if (!pendingUser) {
      resolve({ success: false, error: 'No pending password challenge' })
      return
    }
    pendingUser.completeNewPasswordChallenge(newPassword, {}, {
      onSuccess: () => {
        pendingUser = null
        resolve({ success: true })
      },
      onFailure: (err) => {
        resolve({ success: false, error: err.message || 'Password change failed' })
      },
    })
  })
}

export function getSession(): Promise<CognitoUserSession | null> {
  return new Promise((resolve) => {
    const user = userPool.getCurrentUser()
    if (!user) {
      resolve(null)
      return
    }
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        resolve(null)
        return
      }
      resolve(session)
    })
  })
}

export async function getIdToken(): Promise<string | null> {
  const session = await getSession()
  return session?.getIdToken().getJwtToken() ?? null
}

export function signOut() {
  const user = userPool.getCurrentUser()
  if (user) user.signOut()
}

export function getCurrentUser(): CognitoUser | null {
  return userPool.getCurrentUser()
}
