Security changes and next steps

What I changed in the backend to improve security:

- Added Helmet middleware to set secure HTTP headers.
- Added a basic rate limiter (120 req/min per IP) to slow brute-force access.
- Enforced presence of critical env vars at startup: JWT_SECRET, REFRESH_TOKEN_SECRET, STRIPE_SECRET_KEY.
- Hardened auth cookies:
  - httpOnly
  - path=/
  - secure=true in production
  - sameSite=Strict in production (lax during local development)
  - reasonable maxAge values for access and refresh tokens
- Replaced public Supabase URLs in feed uploads with signed temporary URLs (1 hour expiry).
- Feed route: added PhotoConsent check when a childId is provided and a limit of 6 images per post.
- Feed listing now returns `hasLiked` boolean for the current authenticated user.

Required environment variables (backend/.env):
- JWT_SECRET=your_jwt_secret
- REFRESH_TOKEN_SECRET=your_refresh_secret
- STRIPE_SECRET_KEY=sk_...
- SUPABASE_URL=https://... (if using Supabase storage)
- SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
- SUPABASE_BUCKET=PrivacyPictures (or your bucket name)

Install new dependencies and restart the backend:

1) In the backend folder:

```bash
cd backend
npm install
node index.js
```

Notes and recommendations for production:
- Use a private Supabase bucket for sensitive photos and rely on signed URLs for access; rotate service-role keys periodically.
- If deploying behind a proxy (nginx, cloud provider), ensure `app.set('trust proxy', 1)` is configured and TLS is enforced.
- Consider stricter rate limits, monitoring, and intrusion detection for routes that handle auth and uploads.
- Move long-running email sending to background jobs/queues to avoid blocking request handlers.
- Audit other routes for similar cookie usage and apply the cookieOptions helper pattern where appropriate.
