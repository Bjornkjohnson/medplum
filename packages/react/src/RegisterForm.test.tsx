import { GoogleCredentialResponse, MedplumClient } from '@medplum/core';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { randomUUID, webcrypto } from 'crypto';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { TextEncoder } from 'util';
import { MedplumProvider } from './MedplumProvider';
import { RegisterForm, RegisterFormProps } from './RegisterForm';

function mockFetch(url: string, options: any): Promise<any> {
  let status = 404;
  let result: any;

  if (options.method === 'POST' && url.endsWith('/auth/newuser')) {
    const { email, password } = JSON.parse(options.body);
    if (email === 'new-user@example.com' && password === 'new-password') {
      status = 200;
      result = {
        login: '1',
        code: '1',
      };
    } else {
      status = 400;
      result = {
        resourceType: 'OperationOutcome',
        issue: [
          {
            details: {
              text: 'Email or password is invalid',
            },
          },
        ],
      };
    }
  } else if (options.method === 'POST' && url.endsWith('/auth/newproject')) {
    status = 200;
    result = {
      login: '1',
      code: '1',
    };
  } else if (options.method === 'POST' && url.endsWith('/auth/newpatient')) {
    status = 200;
    result = {
      login: '1',
      code: '1',
    };
  } else if (options.method === 'POST' && url.endsWith('auth/google')) {
    status = 200;
    result = {
      login: '1',
      code: '1',
    };
  } else if (options.method === 'POST' && url.endsWith('auth/profile')) {
    status = 200;
    result = {
      login: '1',
      code: '1',
    };
  } else if (options.method === 'GET' && url.endsWith('Practitioner/123')) {
    status = 200;
    result = {
      resourceType: 'Practitioner',
      id: '123',
      name: [{ given: ['Medplum'], family: ['Admin'] }],
    };
  } else if (options.method === 'POST' && url.endsWith('/oauth2/token')) {
    status = 200;
    result = {
      access_token: 'header.' + window.btoa(JSON.stringify({ client_id: 'my-client-id' })) + '.signature',
      refresh_token: 'header.' + window.btoa(JSON.stringify({ client_id: 'my-client-id' })) + '.signature',
      expires_in: 1,
      token_type: 'Bearer',
      scope: 'openid',
      project: { reference: 'Project/123' },
      profile: { reference: 'Practitioner/123' },
    };
  } else if (options.method === 'GET' && url.endsWith('auth/me')) {
    status = 200;
    result = {
      profile: {
        resourceType: 'Practitioner',
        id: '123',
        name: [{ given: ['Medplum'], family: ['Admin'] }],
      },
    };
  } else {
    console.log(options.method, url);
  }

  const response: any = {
    request: {
      url,
      options,
    },
    status,
    ...result,
  };

  return Promise.resolve({
    status,
    ok: status < 400,
    json: () => Promise.resolve(response),
  });
}

const medplum = new MedplumClient({
  baseUrl: 'https://example.com/',
  clientId: 'my-client-id',
  fetch: mockFetch,
});

async function setup(props: RegisterFormProps): Promise<void> {
  medplum.signOut();

  await act(async () => {
    render(
      <MemoryRouter>
        <MedplumProvider medplum={medplum}>
          <RegisterForm {...props}>
            <h1>Create new account</h1>
          </RegisterForm>
        </MedplumProvider>
      </MemoryRouter>
    );
  });
}

describe('RegisterForm', () => {
  beforeAll(() => {
    Object.defineProperty(global, 'TextEncoder', {
      value: TextEncoder,
    });

    Object.defineProperty(global, 'crypto', {
      value: webcrypto,
    });

    Object.defineProperty(global, 'grecaptcha', {
      value: {
        ready(callback: () => void): void {
          callback();
        },
        execute(): Promise<string> {
          return Promise.resolve('token');
        },
      },
    });
  });

  test('Register new project success', async () => {
    const onSuccess = jest.fn();

    await setup({
      type: 'project',
      onSuccess,
    });

    await act(async () => {
      fireEvent.change(screen.getByTestId('firstName'), { target: { value: 'First' } });
    });

    await act(async () => {
      fireEvent.change(screen.getByTestId('lastName'), { target: { value: 'Last' } });
    });

    await act(async () => {
      fireEvent.change(screen.getByTestId('projectName'), { target: { value: 'My Project' } });
    });

    await act(async () => {
      fireEvent.change(screen.getByTestId('email'), {
        target: { value: 'new-user@example.com' },
      });
    });

    await act(async () => {
      fireEvent.change(screen.getByTestId('password'), {
        target: { value: 'new-password' },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('submit'));
    });

    await waitFor(() => expect(medplum.getProfile()).toBeDefined());

    expect(onSuccess).toHaveBeenCalled();
  });

  test('Register new patient success', async () => {
    const projectId = randomUUID();
    const onSuccess = jest.fn();

    await setup({
      type: 'patient',
      projectId,
      onSuccess,
    });

    await act(async () => {
      fireEvent.change(screen.getByTestId('firstName'), { target: { value: 'First' } });
    });

    await act(async () => {
      fireEvent.change(screen.getByTestId('lastName'), { target: { value: 'Last' } });
    });

    expect(screen.queryByTestId('projectName')).toBeNull();
    expect(screen.queryByText('Project Name')).toBeNull();

    await act(async () => {
      fireEvent.change(screen.getByTestId('email'), {
        target: { value: 'new-user@example.com' },
      });
    });

    await act(async () => {
      fireEvent.change(screen.getByTestId('password'), {
        target: { value: 'new-password' },
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('submit'));
    });

    await waitFor(() => expect(medplum.getProfile()).toBeDefined());

    expect(onSuccess).toHaveBeenCalled();
  });

  test('Google success', async () => {
    const clientId = '123';
    let callback: ((response: GoogleCredentialResponse) => void) | undefined = undefined;

    const google = {
      accounts: {
        id: {
          initialize: jest.fn((args: any) => {
            callback = args.callback;
          }),
          renderButton: jest.fn((parent: HTMLElement) => {
            const button = document.createElement('div');
            button.innerHTML = 'Sign in with Google';
            button.addEventListener('click', () => google.accounts.id.prompt());
            parent.appendChild(button);
          }),
          prompt: jest.fn(() => {
            if (callback) {
              callback({
                clientId,
                credential:
                  'header.' +
                  window.btoa(
                    JSON.stringify({ given_name: 'Google', family_name: 'User', email: 'google-user@example.com' })
                  ) +
                  '.signature',
              });
            }
          }),
        },
      },
    };

    (window as any).google = google;

    const onSuccess = jest.fn();

    await act(async () => {
      await setup({
        type: 'project',
        onSuccess,
        googleClientId: clientId,
      });
    });

    await waitFor(() => expect(screen.getByText('Sign in with Google')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText('Sign in with Google'));
    });

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });
});
