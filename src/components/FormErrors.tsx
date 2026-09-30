import { TriangleAlert } from "lucide-react";

export function FormErrors({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <div className="flash flash-alert" role="alert">
      <TriangleAlert size={18} aria-hidden />
      <ul className="form-error-list">
        {errors.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}
