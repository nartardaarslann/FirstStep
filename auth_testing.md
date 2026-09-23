# Ritim auth test notes

Credentials: `/app/memory/test_credentials.md`. Never fabricate successful Google provider login.

## API
- POST `/api/auth/register` {name,email,password}, POST `/api/auth/login` {email,password}; returns session_token and user.
- Bearer authentication for `/api/auth/me`, `/api/dashboard`, `/api/auth/logout`.
- Sessions are opaque revocable tokens, only SHA256 hashes stored; bcrypt password.
- Invalid auth →401; duplicate registration→409; validation→422.

## Google
- Native redirect generated with Expo Linking.createURL(''); native auth session plus hot/cold link handling.
- Web preview redirect uses current origin root. session_id extracted from query/hash, exchanged once via POST `/api/auth/session`.
- Backend alone calls managed identity API with X-Session-ID. session_token never re-exchanged as session_id.
- No Google test account supplied. Test button redirect + invalid session rejection only without a human identity. Full provider success remains unverified.

## Frontend
- Root gate: loading → Welcome or Onboarding or AppShell based on session state.
- Auth does not perform independent imperative routing. Auth errors inline, no Alert.
- Native secure tokens in SecureStore, logout removes backend session and all local token/state copies.
- Web preview uses the pre-shipped secure storage fallback; a browser product should adopt HttpOnly sessions before public use.