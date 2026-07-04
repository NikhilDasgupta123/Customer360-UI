import { useState } from 'react';
import { loginCustomerGraph, navigateTo } from './authService.js';

export function useLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');

  const togglePassword = () => setShowPassword((currentValue) => !currentValue);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setLoginMessage('');

    try {
      // Role remains server-controlled. The UI only chooses a safe landing page
      // after the backend has authenticated the user.
      const session = await loginCustomerGraph({ email, password });
      const dashboardRoles = new Set(['admin', 'account_manager']);
      navigateTo(dashboardRoles.has(session?.role) ? '/dashboard' : '/customers');
    } catch (error) {
      setLoginMessage(error.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    email,
    password,
    showPassword,
    isSubmitting,
    loginMessage,
    setEmail,
    setPassword,
    togglePassword,
    handleSubmit,
  };
}
