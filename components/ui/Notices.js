import { AlertCircle, LockKeyhole } from "lucide-react";

export function ErrorNotice({ error, title = "The request could not be completed." }) {
  if (!error) return null;
  return (
    <div className="notice notice-error" role="alert">
      <AlertCircle size={18} />
      <div>
        <strong>{title}</strong>
        <p>{error.message || String(error)}</p>
        {error.code && <code>{error.code}</code>}
      </div>
    </div>
  );
}

export function ScopeGate({ scope, children, description }) {
  return (
    <div className="scope-gate">
      <div className="scope-gate-icon"><LockKeyhole size={22} /></div>
      <p className="eyebrow">Permission required</p>
      <h2>{scope}</h2>
      <p>{description || "Your access token does not grant this Johnny-Johnny capability."}</p>
      {children}
    </div>
  );
}
