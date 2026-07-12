import "./globals.css";
import AuthBootstrap from "@/components/auth/AuthBootstrap";

export const metadata = {
  title: "Johnny-Johnny",
  description: "An authenticated workspace for the Johnny-Johnny agent.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthBootstrap>{children}</AuthBootstrap>
      </body>
    </html>
  );
}
