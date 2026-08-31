'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { signIn } from '@/lib/auth-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <form
        className="card stack"
        style={{ width: 380 }}
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          setError(null);
          void signIn
            .email({ email, password })
            .then((result) => {
              if (result.error) {
                setError(result.error.message ?? 'Could not sign in');
                return;
              }

              router.replace('/');
            })
            .finally(() => setPending(false));
        }}
      >
        <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', margin: 0 }}>
          Admin
        </h1>
        <p className="muted">Separate operator login. Members cannot sign in here.</p>
        <label>
          Email
          <input
            autoComplete="username"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
        </label>
        <label>
          Password
          <input
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn btn-primary" disabled={pending} type="submit">
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
