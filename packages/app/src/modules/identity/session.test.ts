import { signOutToLanding } from './session';

describe('sign out', () => {
  it('clears the Backstage session and returns to the public landing', async () => {
    const signOut = jest.fn(async () => undefined);
    const assign = jest.fn();

    await signOutToLanding({ signOut } as never, assign);

    expect(signOut).toHaveBeenCalled();
    expect(assign).toHaveBeenCalledWith('/');
  });

  it('still returns to the landing if sign-out throws a session error', async () => {
    const assign = jest.fn();
    await signOutToLanding(
      {
        signOut: async () => {
          throw new Error('session expired');
        },
      } as never,
      assign,
    );
    expect(assign).toHaveBeenCalledWith('/');
  });
});
