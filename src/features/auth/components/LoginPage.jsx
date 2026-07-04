import './LoginPage.css';
import { useLoginForm } from '../logic/useLoginForm.js';

function RocketLogo() {
  return (
    <svg width="27" height="27" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.2 2.8c-.8-.8-2.1-1.1-3.6-.5-2.2 1-5.7 3.5-7.7 5.5l-4.5-1.1a1 1 0 0 0-1 .3l-2.2 2.2a1 1 0 0 0 .2 1.6l4 2-2.7 3.6a1 1 0 0 0 .2 1.4l2.5 2.5a1 1 0 0 0 1.4.2l3.6-2.7 2 4a1 1 0 0 0 1.6.2l2.2-2.2a1 1 0 0 0 .3-1l-1.1-4.5c2-2 4.5-5.5 5.5-7.7.6-1.5.3-2.8-.5-3.6zM14 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
    </svg>
  );
}

function PersonNodeIcon({ centre = false }) {
  return (
    <svg width={centre ? 48 : 28} height={centre ? 48 : 28} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M12 14c-4.4 0-8 3.1-8 7h16c0-3.9-3.6-7-8-7z" />
      {centre ? (
        <>
          <circle cx="5" cy="11" r="1.2" />
          <circle cx="19" cy="11" r="1.2" />
          <circle cx="12" cy="2" r="1.2" />
        </>
      ) : null}
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

export default function LoginPage() {
  const {
    email,
    password,
    showPassword,
    setEmail,
    setPassword,
    togglePassword,
    handleSubmit,
    isSubmitting,
    loginMessage,
  } = useLoginForm();

  return (
    <main className="orion-login-page">
      <section className="orion-login-visual" aria-label="Orion CX platform overview">
        <div className="orion-stars orion-stars-one" aria-hidden="true" />
        <div className="orion-stars orion-stars-two" aria-hidden="true" />
        <div className="orion-stars orion-stars-three" aria-hidden="true" />

        <div className="orion-ufo" aria-hidden="true">
          <svg width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <ellipse cx="12" cy="14" rx="10" ry="3" fill="rgba(123,66,255,0.4)" />
            <path d="M6 13c0-3.5 2.5-6 6-6s6 2.5 6 6" fill="rgba(164,117,255,0.2)" />
            <circle cx="12" cy="14" r="1" fill="#fff" stroke="none" />
            <circle cx="7" cy="14" r="1" fill="#fff" stroke="none" />
            <circle cx="17" cy="14" r="1" fill="#fff" stroke="none" />
          </svg>
        </div>

        <div className="orion-visual-content">
          <header className="orion-brand-header">
            <div className="orion-brand-mark"><RocketLogo /></div>
            <h1>Orion <span>CX</span></h1>
          </header>

          <p className="orion-brand-subtitle">
            AI-Powered Customer Intelligence
            <br />
            Navigating Relationships Beyond Horizons
          </p>

          <div className="orion-network" aria-hidden="true">
            <div className="orion-network-glow" />
            <div className="orion-orbit-system">
              <svg className="orion-network-lines" viewBox="0 0 360 360">
                <circle cx="180" cy="180" r="140" className="orion-dashed-orbit" />
                <circle cx="40" cy="180" r="2.5" className="orion-point point-one" />
                <circle cx="320" cy="180" r="2.5" className="orion-point point-two" />
                <circle cx="110" cy="240" r="2.5" className="orion-point point-three" />
                <circle cx="250" cy="240" r="2.5" className="orion-point point-four" />
                <circle cx="110" cy="58" r="2.5" className="orion-point point-one" />
                <circle cx="250" cy="58" r="2.5" className="orion-point point-two" />
                <circle cx="180" cy="320" r="2.5" className="orion-point point-five" />
                <line x1="180" y1="180" x2="86" y2="66" />
                <line x1="180" y1="180" x2="274" y2="66" />
                <line x1="180" y1="180" x2="40" y2="180" />
                <line x1="180" y1="180" x2="320" y2="180" />
                <line x1="180" y1="180" x2="111" y2="286" />
                <line x1="180" y1="180" x2="249" y2="286" />
                <polygon points="86,66 274,66 320,180 249,286 111,286 40,180" />
              </svg>
              <div className="orion-node orion-node-outer orion-node-one"><PersonNodeIcon /></div>
              <div className="orion-node orion-node-outer orion-node-two"><PersonNodeIcon /></div>
              <div className="orion-node orion-node-outer orion-node-three"><PersonNodeIcon /></div>
              <div className="orion-node orion-node-outer orion-node-four"><PersonNodeIcon /></div>
              <div className="orion-node orion-node-outer orion-node-five"><PersonNodeIcon /></div>
              <div className="orion-node orion-node-outer orion-node-six"><PersonNodeIcon /></div>
            </div>
            <div className="orion-ring orion-ring-one" />
            <div className="orion-ring orion-ring-two" />
            <div className="orion-node orion-node-centre"><PersonNodeIcon centre /></div>
          </div>

          <div className="orion-feature-pills" aria-label="Platform benefits">
            <span className="orion-feature-pill">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>
              Secure
            </span>
            <span className="orion-feature-pill">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
              AI-Powered
            </span>
            <span className="orion-feature-pill">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
              360° View
            </span>
          </div>
        </div>
      </section>

      <section className="orion-login-form-panel" aria-label="Sign in">
        <form className="orion-login-form" onSubmit={handleSubmit} noValidate>
          <h2>Welcome Back</h2>
          <p className="orion-login-description">Sign in to your Orion CX account</p>

          <div className="orion-form-group">
            <label htmlFor="orion-login-email">Email</label>
            <input
              id="orion-login-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="orion-form-group">
            <label htmlFor="orion-login-password">Password</label>
            <div className="orion-password-field">
              <input
                id="orion-login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
                required
              />
              <button
                className="orion-password-toggle"
                type="button"
                onClick={togglePassword}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                disabled={isSubmitting}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.91 10.91 0 0 1 12 20c-7 0-11-8-11-8a21.77 21.77 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a21.8 21.8 0 0 1-2.17 3.19M14.12 14.12A3 3 0 1 1 9.88 9.88M1 1l22 22" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
            <div className="orion-forgot-row"><a href="#forgot-password" onClick={(event) => event.preventDefault()}>Forgot password?</a></div>
          </div>

          <button className="orion-signin-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </button>

          {loginMessage ? <p className="orion-login-message" role="alert">{loginMessage}</p> : null}

          <div className="orion-divider" aria-hidden="true"><span>or sign in with</span></div>

          <div className="orion-social-row" aria-label="Single sign-on options">
            <button className="orion-social-button" type="button" aria-label="Google sign in is not configured" title="Google sign-in is not configured">
              <GoogleIcon />
            </button>
            <button className="orion-social-button" type="button" aria-label="Microsoft sign in is not configured" title="Microsoft sign-in is not configured">
              <MicrosoftIcon />
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
