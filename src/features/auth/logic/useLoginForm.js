import { useState } from 'react';
import { loginCustomerGraph, navigateTo } from './authService.js';

export function useLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');

  const togglePassword = () => {
    setShowPassword((currentValue) => !currentValue);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setLoginMessage('');

    try {
      // The backend determines the role from the user's database account.
      // No role is accepted from the login UI.
      const session = await loginCustomerGraph({ email, password });

      if (session?.role === 'admin') {
        navigateTo('/admin/users');
        return;
      }

      setLoginMessage(`Login successful. Signed in as ${session?.roleLabel || 'user'}.`);
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
