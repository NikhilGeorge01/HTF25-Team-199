import React, { useState } from 'react';
import './App.css';

export default function LoginPage({ onLogin, onBack }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e && e.preventDefault();
    setError(null);
    if (!username || !password) {
      setError('Enter username and password');
      return;
    }
    try {
      await onLogin(username, password);
    } catch (err) {
      console.error('Login failed', err);
      setError('Login failed');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>Admin Login</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={submit} className="login-form">
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="login-actions">
            <button type="submit" className="btn btn-primary">Login</button>
            <button type="button" className="btn btn-secondary" onClick={onBack}>Back</button>
          </div>
        </form>
      </div>
    </div>
  );
}
