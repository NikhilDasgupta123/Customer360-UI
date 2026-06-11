import { useMemo, useState } from 'react';
import { USER_ROLES } from '../data/roles.js';
import { loginCustomerGraph, requestCustomerGraphAccess } from './authService.js';

const AUTH_MODE = {
  LOGIN: 'login',
  REQUEST_ACCESS: 'request-access',
};

export function useLoginForm() {
  const defaultRole = useMemo(
    () => USER_ROLES.find((role) => role.defaultActive)?.id || USER_ROLES[0]?.id,
    []
  );

  const [authMode, setAuthMode] = useState(AUTH_MODE.LOGIN);
  const [email, setEmail] = useState('admin@customergraph.local');
  const [password, setPassword] = useState('ChangeMe123!');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [team, setTeam] = useState('');
  const [selectedRole, setSelectedRole] = useState(defaultRole);
  const [showPassword, setShowPassword] = useState(false);
  const [authFeedback, setAuthFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const togglePassword = () => {
    setShowPassword((currentValue) => !currentValue);
  };

  const switchToRequestAccess = () => {
    setAuthMode(AUTH_MODE.REQUEST_ACCESS);
    setAuthFeedback(null);
    setPassword('');
    setConfirmPassword('');
    if (selectedRole === 'admin') setSelectedRole(defaultRole);
  };

  const switchToLogin = () => {
    setAuthMode(AUTH_MODE.LOGIN);
    setAuthFeedback(null);
    setPassword('ChangeMe123!');
    setConfirmPassword('');
  };

  const handleLoginSubmit = async () => {
    if (!email.trim()) {
      setAuthFeedback({ type: 'error', message: 'Please enter your email address.' });
      return;
    }

    if (!password) {
      setAuthFeedback({ type: 'error', message: 'Please enter your password.' });
      return;
    }

    const result = await loginCustomerGraph({
      email,
      password,
    });

    setAuthFeedback({
      type: 'success',
      message: `Login successful. Welcome ${result.user.full_name}.`,
    });

    console.log('Login API response:', result);
  };

  const handleRequestAccessSubmit = async () => {
    if (!fullName.trim()) {
      setAuthFeedback({ type: 'error', message: 'Please enter your full name.' });
      return;
    }

    if (!email.trim()) {
      setAuthFeedback({ type: 'error', message: 'Please enter your work email.' });
      return;
    }

    if (!password || password.length < 8) {
      setAuthFeedback({ type: 'error', message: 'Password must contain at least 8 characters.' });
      return;
    }

    if (selectedRole === 'admin') {
      setAuthFeedback({
        type: 'error',
        message: 'Admin access cannot be requested from this screen. Admin users must be created from the backend or admin panel.',
      });
      return;
    }

    if (password !== confirmPassword) {
      setAuthFeedback({ type: 'error', message: 'Password and confirm password do not match.' });
      return;
    }

    const result = await requestCustomerGraphAccess({
      fullName,
      email,
      password,
      confirmPassword,
      roleId: selectedRole,
      team,
    });

    setAuthFeedback({
      type: 'success',
      message: result.message || 'Access request submitted. Please wait for admin approval.',
    });

    console.log('Request access API response:', result);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setAuthFeedback(null);

    try {
      if (authMode === AUTH_MODE.REQUEST_ACCESS) {
        await handleRequestAccessSubmit();
      } else {
        await handleLoginSubmit();
      }
    } catch (error) {
      setAuthFeedback({
        type: 'error',
        message: error.message || 'Something went wrong. Please try again.',
      });
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    authMode,
    email,
    password,
    confirmPassword,
    fullName,
    team,
    selectedRole,
    showPassword,
    authFeedback,
    isSubmitting,
    setEmail,
    setPassword,
    setConfirmPassword,
    setFullName,
    setTeam,
    setSelectedRole,
    togglePassword,
    switchToRequestAccess,
    switchToLogin,
    handleSubmit,
  };
}
