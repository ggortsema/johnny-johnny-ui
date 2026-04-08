# Chatbot Next.js UI

A simple Next.js front end for exercising the Spring Boot chatbot backend.

## Requirements

- Node.js 18, 20, or 22
- npm installed
- Your Spring Boot backend running on `http://localhost:8080`

## Run locally on a Mac

1. Unzip the project
2. Open Terminal and go into the folder
3. Install dependencies:

```bash
npm install
```

4. Start the development server:

```bash
npm run dev
```

5. Open your browser to:

```text
http://localhost:3000
```

## Build for production

```bash
npm run build
npm run start
```

Then open:

```text
http://localhost:3000
```

## How to use

- Set the backend base URL if needed
- Click **Check health** to verify the backend is reachable
- Choose a sender type
- Choose a variant to display
- Enter the incoming message
- Click **Send**

The page will only display the selected variant returned by the backend.

## Notes

If your backend rejects calls from `http://localhost:3000`, add CORS support to your Spring Boot app.
