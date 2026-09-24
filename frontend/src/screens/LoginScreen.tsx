import { useState, type FormEvent } from 'react'
import { useAuthStore } from '../store/authStore'

export default function LoginScreen() {
  const { login, setNewPassword, error, isLoading, needsNewPassword, clearError } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword2] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')

  function handleLogin(e: FormEvent) {
    e.preventDefault()
    setLocalError('')
    clearError()
    if (!email.trim() || !password.trim()) {
      setLocalError('Enter email and password')
      return
    }
    login(email.trim(), password)
  }

  function handleNewPassword(e: FormEvent) {
    e.preventDefault()
    setLocalError('')
    clearError()
    if (newPassword.length < 8) {
      setLocalError('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }
    setNewPassword(newPassword)
  }

  const displayError = localError || error

  if (needsNewPassword) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--color-pblue-lt)_0%,_transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,_rgba(29,78,216,0.05)_0%,_transparent_70%)] opacity-40" />
        <div className="w-full max-w-md relative screen-enter">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-royal rounded-2xl mb-6 shadow-lg shadow-royal/20">
              <span className="text-white text-3xl font-black font-mono">P</span>
            </div>
            <h1 className="text-2xl font-extrabold text-ink dark:text-white tracking-tight">
              Set New Password
            </h1>
            <p className="text-ink-subtle dark:text-slate-300 mt-2 text-sm">
              Your temporary password must be changed
            </p>
          </div>

          <form onSubmit={handleNewPassword} className="space-y-4">
            <div>
              <label htmlFor="newpw" className="block text-sm font-semibold text-ink dark:text-white mb-2">
                New Password
              </label>
              <input
                id="newpw"
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword2(e.target.value); setLocalError('') }}
                placeholder="At least 8 characters"
                autoFocus
                disabled={isLoading}
                className="w-full px-4 py-3.5 text-lg rounded-xl border-2 bg-surface-raised dark:bg-card-dark text-ink dark:text-white placeholder:text-ink-subtle/40 transition-all outline-none border-mist dark:border-border-dark focus:border-royal dark:focus:border-royal focus:ring-4 focus:ring-royal/10"
              />
            </div>
            <div>
              <label htmlFor="confirmpw" className="block text-sm font-semibold text-ink dark:text-white mb-2">
                Confirm Password
              </label>
              <input
                id="confirmpw"
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setLocalError('') }}
                placeholder="Re-enter password"
                disabled={isLoading}
                className="w-full px-4 py-3.5 text-lg rounded-xl border-2 bg-surface-raised dark:bg-card-dark text-ink dark:text-white placeholder:text-ink-subtle/40 transition-all outline-none border-mist dark:border-border-dark focus:border-royal dark:focus:border-royal focus:ring-4 focus:ring-royal/10"
              />
            </div>

            {displayError && (
              <p className="text-sm text-pred font-medium" role="alert">{displayError}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-royal hover:bg-medium text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-royal/20 active:scale-[0.99]"
            >
              {isLoading ? 'Updating...' : 'Set Password & Sign In'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--color-pblue-lt)_0%,_transparent_70%)] dark:bg-[radial-gradient(ellipse_at_center,_rgba(29,78,216,0.05)_0%,_transparent_70%)] opacity-40" />
      <div className="w-full max-w-md relative screen-enter">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-royal rounded-2xl mb-6 shadow-lg shadow-royal/20">
            <span className="text-white text-3xl font-black font-mono">P</span>
          </div>
          <h1 className="text-2xl font-extrabold text-ink dark:text-white tracking-tight">
            Course Quality Review
          </h1>
          <p className="text-ink-subtle dark:text-slate-300 mt-2 text-sm">Sign in to continue</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-ink dark:text-white mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setLocalError('') }}
              placeholder="you@example.edu"
              autoFocus
              autoComplete="email"
              disabled={isLoading}
              className="w-full px-4 py-3.5 text-lg rounded-xl border-2 bg-surface-raised dark:bg-card-dark text-ink dark:text-white placeholder:text-ink-subtle/40 transition-all outline-none border-mist dark:border-border-dark focus:border-royal dark:focus:border-royal focus:ring-4 focus:ring-royal/10"
            />
          </div>
          <div>
            <label htmlFor="pw" className="block text-sm font-semibold text-ink dark:text-white mb-2">
              Password
            </label>
            <input
              id="pw"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setLocalError('') }}
              placeholder="Enter password"
              autoComplete="current-password"
              disabled={isLoading}
              className="w-full px-4 py-3.5 text-lg rounded-xl border-2 bg-surface-raised dark:bg-card-dark text-ink dark:text-white placeholder:text-ink-subtle/40 transition-all outline-none border-mist dark:border-border-dark focus:border-royal dark:focus:border-royal focus:ring-4 focus:ring-royal/10"
            />
          </div>

          {displayError && (
            <p className="text-sm text-pred font-medium" role="alert">{displayError}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-royal hover:bg-medium text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-royal/20 active:scale-[0.99]"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="8" strokeLinecap="round"/>
                </svg>
                Signing in
              </span>
            ) : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
