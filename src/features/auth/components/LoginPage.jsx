import './LoginPage.css';
import { USER_ROLES } from '../data/roles.js';
import { useLoginForm } from '../logic/useLoginForm.js';

export default function LoginPage() {
  const {
    email,
    password,
    selectedRole,
    showPassword,
    setEmail,
    setPassword,
    setSelectedRole,
    togglePassword,
    handleSubmit,
  } = useLoginForm();

  return (
    <>
      <div className="left">
        <div className="brand-content">
          <div className="brand-row">
            <div className="brand-icon"><i className="ti ti-stars"></i></div>
            <span className="brand-name">Orion <span>CX</span></span>
          </div>
          <p className="brand-tagline">AI-Powered Customer Intelligence<br />Navigating Relationships Beyond Horizons</p>
        </div>

        <div className="network-wrap">
          <svg className="network-svg" viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg">
            <circle cx="110" cy="110" r="95" fill="none" stroke="rgba(139,92,246,0.15)" strokeWidth="1" strokeDasharray="4 6" />
            <circle cx="110" cy="110" r="68" fill="none" stroke="rgba(99,102,241,0.2)" strokeWidth="1" strokeDasharray="3 5" />

            <line x1="110" y1="110" x2="52" y2="58" stroke="#6366f1" strokeWidth="1.5" opacity="0.6" />
            <line x1="110" y1="110" x2="168" y2="58" stroke="#6366f1" strokeWidth="1.5" opacity="0.6" />
            <line x1="110" y1="110" x2="36" y2="120" stroke="#8b5cf6" strokeWidth="1.5" opacity="0.6" />
            <line x1="110" y1="110" x2="184" y2="120" stroke="#8b5cf6" strokeWidth="1.5" opacity="0.6" />
            <line x1="110" y1="110" x2="80" y2="172" stroke="#a78bfa" strokeWidth="1.5" opacity="0.55" />
            <line x1="110" y1="110" x2="146" y2="170" stroke="#a78bfa" strokeWidth="1.5" opacity="0.55" />
            <line x1="52" y1="58" x2="168" y2="58" stroke="#6366f1" strokeWidth="1" opacity="0.3" />
            <line x1="36" y1="120" x2="80" y2="172" stroke="#8b5cf6" strokeWidth="1" opacity="0.3" />
            <line x1="184" y1="120" x2="146" y2="170" stroke="#8b5cf6" strokeWidth="1" opacity="0.3" />

            <circle cx="18" cy="85" r="3" fill="#a78bfa" opacity="0.6" />
            <circle cx="200" cy="85" r="3" fill="#818cf8" opacity="0.6" />
            <circle cx="62" cy="194" r="3" fill="#a78bfa" opacity="0.5" />
            <circle cx="158" cy="193" r="3" fill="#a78bfa" opacity="0.5" />
            <line x1="36" y1="120" x2="18" y2="85" stroke="#6366f1" strokeWidth="0.8" opacity="0.35" />
            <line x1="184" y1="120" x2="200" y2="85" stroke="#8b5cf6" strokeWidth="0.8" opacity="0.35" />
            <line x1="80" y1="172" x2="62" y2="194" stroke="#6366f1" strokeWidth="0.8" opacity="0.35" />
            <line x1="146" y1="170" x2="158" y2="193" stroke="#6366f1" strokeWidth="0.8" opacity="0.35" />

            <circle cx="110" cy="110" r="36" fill="rgba(99,102,241,0.15)" />
            <circle cx="110" cy="110" r="28" fill="#4f46e5" opacity="0.95" />
            <circle cx="110" cy="110" r="36" fill="none" stroke="#818cf8" strokeWidth="1.2" opacity="0.6" />
            <circle cx="110" cy="103" r="8" fill="#fff" opacity="0.95" />
            <ellipse cx="110" cy="124" rx="11.5" ry="7" fill="#fff" opacity="0.85" />

            <circle cx="52" cy="58" r="20" fill="#6366f1" opacity="0.9" />
            <circle cx="52" cy="58" r="25" fill="none" stroke="#818cf8" strokeWidth="0.8" opacity="0.4" />
            <circle cx="52" cy="52" r="6" fill="#fff" opacity="0.9" />
            <ellipse cx="52" cy="67" rx="8.5" ry="5" fill="#fff" opacity="0.8" />

            <circle cx="168" cy="58" r="20" fill="#7c3aed" opacity="0.9" />
            <circle cx="168" cy="58" r="25" fill="none" stroke="#a78bfa" strokeWidth="0.8" opacity="0.4" />
            <circle cx="168" cy="52" r="6" fill="#fff" opacity="0.9" />
            <ellipse cx="168" cy="67" rx="8.5" ry="5" fill="#fff" opacity="0.8" />

            <circle cx="36" cy="120" r="14" fill="#8b5cf6" opacity="0.85" />
            <circle cx="36" cy="115" r="4.2" fill="#fff" opacity="0.9" />
            <ellipse cx="36" cy="126" rx="6" ry="3.6" fill="#fff" opacity="0.8" />

            <circle cx="184" cy="120" r="14" fill="#6366f1" opacity="0.85" />
            <circle cx="184" cy="115" r="4.2" fill="#fff" opacity="0.9" />
            <ellipse cx="184" cy="126" rx="6" ry="3.6" fill="#fff" opacity="0.8" />

            <circle cx="80" cy="172" r="14" fill="#7c3aed" opacity="0.8" />
            <circle cx="80" cy="167" r="4.2" fill="#fff" opacity="0.9" />
            <ellipse cx="80" cy="178" rx="6" ry="3.6" fill="#fff" opacity="0.8" />

            <circle cx="146" cy="170" r="12" fill="#8b5cf6" opacity="0.75" />
            <circle cx="146" cy="165" r="3.6" fill="#fff" opacity="0.9" />
            <ellipse cx="146" cy="176" rx="5.2" ry="3" fill="#fff" opacity="0.8" />

            <circle cx="98" cy="110" r="2" fill="#e0e7ff" opacity="0.9" />
            <circle cx="110" cy="110" r="2" fill="#e0e7ff" opacity="0.9" />
            <circle cx="122" cy="110" r="2" fill="#e0e7ff" opacity="0.9" />
          </svg>
        </div>

        <div className="badge-row">
          <span className="badge"><i className="ti ti-shield-check"></i> Secure</span>
          <span className="badge"><i className="ti ti-bolt"></i> AI-Powered</span>
          <span className="badge"><i className="ti ti-globe"></i> 360° View</span>
        </div>
      </div>

      <div className="right">
        <form className="form-inner" onSubmit={handleSubmit}>
          <p className="welcome-h">Welcome Back</p>
          <p className="welcome-s">Sign in to your Orion CX account</p>

          <label className="field-lbl">Email</label>
          <div className="field-grp">
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <label className="field-lbl">Password</label>
          <div className="field-grp">
            <input
              type={showPassword ? 'text' : 'password'}
              id="pwd"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <i
              className={`ti ${showPassword ? 'ti-eye-off' : 'ti-eye'} eye-icon`}
              id="eyeBtn"
              onClick={togglePassword}
              role="button"
              tabIndex="0"
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') togglePassword();
              }}
            ></i>
          </div>

          <div className="forgot-row"><a href="#">Forgot password?</a></div>

          <button className="signin-btn" type="submit">Sign In</button>

          <div className="divider"><hr /><span>or sign in with</span><hr /></div>

          <div className="social-row">
            <div className="social-btn" title="Google">
              <svg width="22" height="22" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.3 0 5.9 1.1 7.9 2.9l5.9-5.9C34.1 3.4 29.4 1.5 24 1.5 14.9 1.5 7.2 7 3.7 14.8l6.9 5.4C12.2 14 17.6 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.9 7.2l7.6 5.9c4.4-4.1 7.1-10.1 7.1-17.1z" />
                <path fill="#FBBC05" d="M10.6 28.8A14.5 14.5 0 0 1 9.5 24c0-1.7.3-3.3.9-4.8l-6.9-5.4A22.5 22.5 0 0 0 1.5 24c0 3.6.8 7 2.3 10.1l6.8-5.3z" />
                <path fill="#34A853" d="M24 46.5c5.4 0 10-1.8 13.3-4.9l-7.6-5.9c-1.8 1.2-4.1 1.9-5.7 1.9-6.4 0-11.8-4.3-13.5-10.1l-6.8 5.3C7.1 40.9 14.9 46.5 24 46.5z" />
              </svg>
            </div>
            <div className="social-btn" title="Microsoft">
              <svg width="22" height="22" viewBox="0 0 21 21">
                <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
              </svg>
            </div>
          </div>

          <p className="role-lbl">Select your role</p>
          <div className="roles-grid">
            {USER_ROLES.map((role) => (
              <div
                key={role.id}
                className={`role-card ${selectedRole === role.id ? 'active' : ''}`}
                onClick={() => setSelectedRole(role.id)}
              >
                <div className="role-icon"><i className={role.iconClass}></i></div>
                <p className="role-card-t">{role.title}</p>
                <p className="role-card-s">{role.subtitle}</p>
              </div>
            ))}
          </div>
        </form>
      </div>
    </>
  );
}
