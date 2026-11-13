# Security

Report vulnerabilities privately through GitHub: **Security > Report a vulnerability** on this repository. Please do not open a public issue for security problems.

Notes for anyone running this app:

- Set a long random `BETTER_AUTH_SECRET`. Never commit `.env`.
- Points, scores and the avatar state are kept in the browser (`localStorage`) and synced to the server. The server takes the larger value on sync, so a determined player can inflate their own points. Do not use this for anything with real prizes.
- The first person to join an empty room becomes its admin.
