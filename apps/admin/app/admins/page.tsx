'use client';

import type { AdminRoleName } from '@product/client';
import type { InviteAdminInput } from '@product/contract';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Shell } from '@/components/shell';
import { adminApi } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

const ROLE_OPTIONS: AdminRoleName[] = ['content', 'support', 'superadmin'];

export default function AdminsPage() {
  const queryClient = useQueryClient();
  const listQuery = useQuery({
    queryKey: ['admin', 'operators'],
    queryFn: () => adminApi.listOperators(),
  });
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [roles, setRoles] = useState<AdminRoleName[]>(['content']);

  const invite = useMutation({
    mutationFn: (input: InviteAdminInput) => adminApi.inviteOperator(input),
    onSuccess: async () => {
      setEmail('');
      setName('');
      setPassword('');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'operators'] });
    },
  });
  const setActive = useMutation({
    mutationFn: (input: { adminUserId: string; isActive: boolean }) =>
      adminApi.setOperatorActive(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'operators'] });
    },
  });

  return (
    <Shell>
      <div className="page stack">
        <h1 style={{ fontFamily: 'Fraunces, Georgia, serif' }}>Admins</h1>
        <form
          className="card stack"
          onSubmit={(event) => {
            event.preventDefault();
            invite.mutate({ email, name, password, roles });
          }}
        >
          <h2>Invite</h2>
          <div className="row">
            <label>
              Name
              <input onChange={(event) => setName(event.target.value)} value={name} />
            </label>
            <label>
              Email
              <input
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
            </label>
            <label>
              Password
              <input
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </label>
          </div>
          <div className="row">
            {ROLE_OPTIONS.map((role) => (
              <label key={role}>
                <span>
                  <input
                    checked={roles.includes(role)}
                    onChange={(event) => {
                      setRoles((current) =>
                        event.target.checked
                          ? [...current, role]
                          : current.filter((item) => item !== role),
                      );
                    }}
                    type="checkbox"
                  />{' '}
                  {role}
                </span>
              </label>
            ))}
          </div>
          {invite.error ? (
            <p className="error">{errorMessage(invite.error, 'Could not invite')}</p>
          ) : null}
          <button className="btn btn-primary" type="submit">
            Create operator
          </button>
        </form>
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Active</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(listQuery.data?.operators ?? []).map((operator) => (
                <tr key={operator.id}>
                  <td>{operator.name}</td>
                  <td>{operator.email}</td>
                  <td>{operator.roles.join(', ')}</td>
                  <td>{operator.isActive ? 'Yes' : 'No'}</td>
                  <td>
                    <button
                      className="btn btn-ghost"
                      onClick={() =>
                        setActive.mutate({
                          adminUserId: operator.id,
                          isActive: !operator.isActive,
                        })
                      }
                      type="button"
                    >
                      {operator.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
