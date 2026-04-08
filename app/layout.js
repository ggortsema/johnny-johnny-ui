export const metadata = {
  title: "Chatbot Test UI",
  description: "Next.js UI for testing the Spring Boot chatbot backend"
};

import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
